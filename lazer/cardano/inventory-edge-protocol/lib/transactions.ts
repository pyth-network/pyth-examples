import "dotenv/config";

import * as Address from "@evolution-sdk/evolution/Address";
import { ScriptHash, TransactionHash } from "@evolution-sdk/evolution";
import { toCBORHex } from "@evolution-sdk/evolution/Data";
import { InlineDatum } from "@evolution-sdk/evolution/InlineDatum";
import { PlutusV3 } from "@evolution-sdk/evolution/PlutusV3";
import type { Data } from "@evolution-sdk/evolution/Data";
import { getPythScriptHash, getPythState } from "@pythnetwork/pyth-lazer-cardano-js";

import { loadBlueprint, vaultSpendValidator } from "./blueprint.js";
import {
  encodeVaultDatum,
  optionNone,
  redeemerAdjust,
  redeemerApplyHedge,
  redeemerClaimInsurance,
  redeemerClose,
  redeemerLiquidate,
  vaultDatumWithDebt,
  vaultDatumWithHedge,
} from "./datum_codec.js";
import { decodeVaultDatum } from "./vault_datum_decode.js";
import {
  createPreprodReadClient,
  createPreprodSigningClient,
} from "./evolution_client.js";
import { withLucidPreprod } from "./mint_shadow.js";
import { fetchSolanaFormatUpdate, PYTH_POLICY_ID_HEX } from "./pyth.js";
import { enterpriseVaultAddress, paymentKeyHashBytes } from "./vault_address.js";
import type { UTxO } from "@evolution-sdk/evolution/UTxO";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function plutusV3FromBlueprint(compiledHex: string): PlutusV3 {
  return new PlutusV3({
    bytes: Uint8Array.from(Buffer.from(compiledHex, "hex")),
  });
}

function normalizeAssetHex(h: string): string {
  return h.replace(/\s/g, "").toLowerCase();
}

export function readInlineDatum(utxo: UTxO): Data {
  const d = utxo.datumOption;
  if (!d || d._tag !== "InlineDatum") {
    throw new Error("Vault UTxO must use inline datum");
  }
  return d.data;
}

/**
 * Lock shadow NFT + vault datum at the script (no Pyth in this tx).
 * Uses Lucid + Blockfrost/Maestro so UTxOs match `mint_shadow` (Evolution/Koios can miss them).
 */
export async function openVault(params: {
  nftPolicyHex: string;
  nftNameHex: string;
  feedId: number;
  debtLovelace: bigint;
  collateralQty: bigint;
}): Promise<string> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  const bp = loadBlueprint();
  const val = vaultSpendValidator(bp);
  const vaultBech32 = Address.toBech32(enterpriseVaultAddress(val.hash));

  const policyHex = normalizeAssetHex(params.nftPolicyHex);
  const nameHex = normalizeAssetHex(params.nftNameHex);
  const unit = policyHex + nameHex;

  return withLucidPreprod(async (lucid) => {
    lucid.selectWalletFromSeed(mnemonic);
    const userBech32 = await lucid.wallet.address();
    const ownerKh = paymentKeyHashBytes(Address.fromBech32(userBech32));

    const utxos = await lucid.wallet.getUtxos();
    const nftIn = utxos.find((u) => u.assets[unit] === 1n);
    if (!nftIn) {
      const sample = utxos.flatMap((u) =>
        Object.entries(u.assets)
          .filter(([k, q]) => k !== "lovelace" && q === 1n)
          .map(([k]) => k),
      );
      throw new Error(
        `No UTxO with NFT (vista Lucid/Blockfrost). Unit esperado: ${unit}. ` +
          `NFTs (qty=1) en wallet: ${
            sample.length ? sample.slice(0, 12).join(" | ") : "(ninguno)"
          }. ¿El NFT ya está en la vault o usás otra seed?`,
      );
    }

    const datum = encodeVaultDatum({
      ownerKeyHash: ownerKh,
      pythPolicyHex: PYTH_POLICY_ID_HEX,
      nftPolicyHex: policyHex,
      nftNameHex: nameHex,
      debtLovelace: params.debtLovelace,
      collateralQty: params.collateralQty,
      feedId: BigInt(params.feedId),
      hedge: optionNone(),
    });

    const inlineDatum = toCBORHex(datum);

    const tx = await lucid
      .newTx()
      .collectFrom([nftIn])
      .payToContract(vaultBech32, { inline: inlineDatum }, nftIn.assets)
      .complete();

    const signed = await tx.sign().complete();
    return await signed.submit();
  });
}

/** Owner adds parametric insurance fields (strike + payout) — no Pyth. */
export async function applyHedge(params: {
  vaultUtxo: UTxO;
  strikeRaw: bigint;
  payoutLovelace: bigint;
}): Promise<string> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  const client = createPreprodSigningClient(mnemonic);
  const bp = loadBlueprint();
  const val = vaultSpendValidator(bp);
  const vaultAddr = enterpriseVaultAddress(val.hash);
  const script = plutusV3FromBlueprint(val.compiledCode);

  const prev = readInlineDatum(params.vaultUtxo);
  const nextDatum = vaultDatumWithHedge(
    prev,
    params.strikeRaw,
    params.payoutLovelace,
  );
  const r = redeemerApplyHedge(params.strikeRaw, params.payoutLovelace);

  const now = BigInt(Date.now());
  const built = await client
    .newTx()
    .setValidity({ from: now - 60_000n, to: now + 120_000n })
    .collectFrom({ inputs: [params.vaultUtxo], redeemer: r })
    .payToAddress({
      address: vaultAddr,
      assets: params.vaultUtxo.assets,
      datum: new InlineDatum({ data: nextDatum }),
    })
    .attachScript({ script })
    .build();

  const digest = await built.signAndSubmit();
  return TransactionHash.toHex(digest);
}

/**
 * Single tx: Pyth Lazer zero-withdrawal (verified payload) + vault `Liquidate` when underwater.
 */
export async function liquidate(params: {
  vaultUtxo: UTxO;
  /** Which feed id to pull from Lazer (must match vault datum feed_id on-chain). */
  priceFeedId: number;
}): Promise<string> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  const token = requireEnv("ACCESS_TOKEN");
  const client = createPreprodSigningClient(mnemonic);
  const bp = loadBlueprint();
  const val = vaultSpendValidator(bp);
  const script = plutusV3FromBlueprint(val.compiledCode);

  const update = await fetchSolanaFormatUpdate(token, [params.priceFeedId]);
  const readClient = createPreprodReadClient();
  const pythState = await getPythState(PYTH_POLICY_ID_HEX, readClient);
  const pythScriptHex = getPythScriptHash(pythState);
  const recv = await client.address();

  const now = BigInt(Date.now());
  const built = await client
    .newTx()
    .setValidity({ from: now - 60_000n, to: now + 120_000n })
    .readFrom({ referenceInputs: [pythState] })
    .withdraw({
      amount: 0n,
      redeemer: [update],
      stakeCredential: ScriptHash.fromHex(pythScriptHex),
    })
    .collectFrom({
      inputs: [params.vaultUtxo],
      redeemer: redeemerLiquidate(),
    })
    .payToAddress({
      address: recv,
      assets: params.vaultUtxo.assets,
    })
    .attachScript({ script })
    .build();

  const digest = await built.signAndSubmit();
  return TransactionHash.toHex(digest);
}

export async function fetchFirstVaultUtxo(): Promise<UTxO> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  const client = createPreprodSigningClient(mnemonic);
  const bp = loadBlueprint();
  const val = vaultSpendValidator(bp);
  const vaultAddr = enterpriseVaultAddress(val.hash);
  const utxos = await client.getUtxos(vaultAddr);
  const u = utxos[0];
  if (!u) throw new Error("No UTxO at vault script — run openVault first");
  return u;
}

export async function getVaultUtxoByRef(
  txHashHex: string,
  outputIndex: number,
): Promise<UTxO> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  const client = createPreprodSigningClient(mnemonic);
  const bp = loadBlueprint();
  const val = vaultSpendValidator(bp);
  const vaultAddr = enterpriseVaultAddress(val.hash);
  const utxos = await client.getUtxos(vaultAddr);
  const idx = BigInt(outputIndex);
  const u = utxos.find(
    (x) =>
      TransactionHash.toHex(x.transactionId) === txHashHex && x.index === idx,
  );
  if (!u) {
    throw new Error(
      `No vault UTxO ${txHashHex}#${outputIndex} (refresh list; index may have changed)`,
    );
  }
  return u;
}

export type VaultPositionRow = {
  txHash: string;
  outputIndex: string;
  ref: string;
  datum: ReturnType<typeof decodeVaultDatum>;
  lovelace: string;
};

export async function listVaultPositions(): Promise<VaultPositionRow[]> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  const client = createPreprodSigningClient(mnemonic);
  const bp = loadBlueprint();
  const val = vaultSpendValidator(bp);
  const vaultAddr = enterpriseVaultAddress(val.hash);
  const utxos = await client.getUtxos(vaultAddr);
  const rows: VaultPositionRow[] = [];
  for (const u of utxos) {
    try {
      const d = readInlineDatum(u);
      const datum = decodeVaultDatum(d);
      rows.push({
        txHash: TransactionHash.toHex(u.transactionId),
        outputIndex: u.index.toString(),
        ref: `${TransactionHash.toHex(u.transactionId)}#${u.index}`,
        datum,
        lovelace: u.assets.lovelace.toString(),
      });
    } catch {
      /* skip non-vault outputs */
    }
  }
  return rows;
}

/** Owner updates synthetic debt (e.g. repay to 0 before Close). */
export async function adjustDebt(params: {
  vaultUtxo: UTxO;
  newDebtLovelace: bigint;
}): Promise<string> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  const client = createPreprodSigningClient(mnemonic);
  const bp = loadBlueprint();
  const val = vaultSpendValidator(bp);
  const vaultAddr = enterpriseVaultAddress(val.hash);
  const script = plutusV3FromBlueprint(val.compiledCode);

  const prev = readInlineDatum(params.vaultUtxo);
  const nextDatum = vaultDatumWithDebt(prev, params.newDebtLovelace);
  const r = redeemerAdjust(params.newDebtLovelace);

  const now = BigInt(Date.now());
  const built = await client
    .newTx()
    .setValidity({ from: now - 60_000n, to: now + 120_000n })
    .collectFrom({ inputs: [params.vaultUtxo], redeemer: r })
    .payToAddress({
      address: vaultAddr,
      assets: params.vaultUtxo.assets,
      datum: new InlineDatum({ data: nextDatum }),
    })
    .attachScript({ script })
    .build();

  const digest = await built.signAndSubmit();
  return TransactionHash.toHex(digest);
}

/** Owner closes vault when debt is 0; NFT returns to wallet. */
export async function closeVault(params: {
  vaultUtxo: UTxO;
}): Promise<string> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  const client = createPreprodSigningClient(mnemonic);
  const bp = loadBlueprint();
  const val = vaultSpendValidator(bp);
  const script = plutusV3FromBlueprint(val.compiledCode);
  const recv = await client.address();

  const prev = readInlineDatum(params.vaultUtxo);
  const decoded = decodeVaultDatum(prev);
  if (decoded.debtLovelace !== 0n) {
    throw new Error("debt must be 0 to Close (use Adjust first)");
  }

  const now = BigInt(Date.now());
  const built = await client
    .newTx()
    .setValidity({ from: now - 60_000n, to: now + 120_000n })
    .collectFrom({
      inputs: [params.vaultUtxo],
      redeemer: redeemerClose(),
    })
    .payToAddress({
      address: recv,
      assets: params.vaultUtxo.assets,
    })
    .attachScript({ script })
    .build();

  const digest = await built.signAndSubmit();
  return TransactionHash.toHex(digest);
}

/**
 * Parametric claim: Pyth price must be &lt; strike (on-chain). Assets return to owner wallet.
 * Note: payout_lovelace in datum is informational in this MVP; settlement is the unlocked UTxO.
 */
export async function claimInsurance(params: {
  vaultUtxo: UTxO;
  priceFeedId: number;
}): Promise<string> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  const token = requireEnv("ACCESS_TOKEN");
  const client = createPreprodSigningClient(mnemonic);
  const bp = loadBlueprint();
  const val = vaultSpendValidator(bp);
  const script = plutusV3FromBlueprint(val.compiledCode);

  const update = await fetchSolanaFormatUpdate(token, [params.priceFeedId]);
  const readClient = createPreprodReadClient();
  const pythState = await getPythState(PYTH_POLICY_ID_HEX, readClient);
  const pythScriptHex = getPythScriptHash(pythState);
  const recv = await client.address();

  const now = BigInt(Date.now());
  const built = await client
    .newTx()
    .setValidity({ from: now - 60_000n, to: now + 120_000n })
    .readFrom({ referenceInputs: [pythState] })
    .withdraw({
      amount: 0n,
      redeemer: [update],
      stakeCredential: ScriptHash.fromHex(pythScriptHex),
    })
    .collectFrom({
      inputs: [params.vaultUtxo],
      redeemer: redeemerClaimInsurance(),
    })
    .payToAddress({
      address: recv,
      assets: params.vaultUtxo.assets,
    })
    .attachScript({ script })
    .build();

  const digest = await built.signAndSubmit();
  return TransactionHash.toHex(digest);
}
