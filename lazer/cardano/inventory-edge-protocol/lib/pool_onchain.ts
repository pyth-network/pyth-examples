/**
 * Depósitos reales de tADA al script `liquidity_pool` (PreProd) vía Lucid.
 * Retiros: Evolution SDK + Plutus V3 (Lucid no adjunta gasto V3).
 * El datum fija el payment key hash del dueño; solo esa clave puede gastar ese UTxO.
 */
import { TransactionHash } from "@evolution-sdk/evolution";
import { toCBORHex } from "@evolution-sdk/evolution/Data";
import * as Address from "@evolution-sdk/evolution/Address";
import * as Assets from "@evolution-sdk/evolution/Assets";
import { PlutusV3 } from "@evolution-sdk/evolution/PlutusV3";
import type { UTxO } from "@evolution-sdk/evolution/UTxO";

import { loadBlueprint, liquidityPoolSpendValidator } from "./blueprint.js";
import { encodePoolDatum, redeemerPoolSpend } from "./datum_codec.js";
import { createPreprodSigningClient } from "./evolution_client.js";
import { withLucidPreprod } from "./mint_shadow.js";
import { decodePoolDatumOwnerHex } from "./pool_datum_decode.js";
import { readInlineDatum } from "./transactions.js";
import {
  enterpriseVaultAddress,
  paymentKeyHashBytes,
} from "./vault_address.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/** Lovelace mínimo que debe quedar en la wallet para fees (configurable). */
export function poolDepositReserveLovelace(): bigint {
  const raw = process.env.POOL_DEPOSIT_RESERVE_LOVELACE?.trim();
  if (raw) return BigInt(raw);
  return 4_000_000n;
}

export function liquidityPoolAddressBech32(): string {
  const bp = loadBlueprint();
  const val = liquidityPoolSpendValidator(bp);
  return Address.toBech32(enterpriseVaultAddress(val.hash));
}

export async function walletTotalLovelaceLucid(): Promise<bigint> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  return withLucidPreprod(async (lucid) => {
    lucid.selectWalletFromSeed(mnemonic);
    const utxos = await lucid.wallet.getUtxos();
    let total = 0n;
    for (const u of utxos) {
      total += u.assets.lovelace;
    }
    return total;
  });
}

export async function depositLiquidityPoolOnChain(params: {
  lovelace: bigint;
}): Promise<string> {
  if (params.lovelace <= 0n) {
    throw new Error("lovelace must be positive");
  }
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  return withLucidPreprod(async (lucid) => {
    lucid.selectWalletFromSeed(mnemonic);
    const userBech32 = await lucid.wallet.address();
    const details = lucid.utils.getAddressDetails(userBech32);
    if (details.paymentCredential?.type !== "Key") {
      throw new Error("Expected key payment credential for pool datum owner");
    }
    const hashHex = details.paymentCredential.hash;
    if (hashHex.length !== 56) {
      throw new Error(`Unexpected payment key hash length: ${hashHex.length}`);
    }
    const ownerKh = Uint8Array.from(Buffer.from(hashHex, "hex"));
    const poolBech32 = liquidityPoolAddressBech32();
    const inline = toCBORHex(encodePoolDatum(ownerKh));

    const utxos = await lucid.wallet.getUtxos();
    let total = 0n;
    for (const u of utxos) {
      total += u.assets.lovelace;
    }

    const reserve = poolDepositReserveLovelace();
    if (total < params.lovelace + reserve) {
      throw new Error(
        `Saldo insuficiente: wallet ${total} lovelace; envío ${params.lovelace} + reserva fees ${reserve} = ${params.lovelace + reserve}. Bajá el monto o POOL_DEPOSIT_RESERVE_LOVELACE.`,
      );
    }

    const tx = await lucid
      .newTx()
      .payToContract(poolBech32, { inline: inline }, { lovelace: params.lovelace })
      .complete();

    const signed = await tx.sign().complete();
    return signed.submit();
  });
}

function poolPlutusV3(): PlutusV3 {
  const bp = loadBlueprint();
  const val = liquidityPoolSpendValidator(bp);
  return new PlutusV3({
    bytes: Uint8Array.from(Buffer.from(val.compiledCode, "hex")),
  });
}

export type PoolOnChainPositionRow = {
  txHash: string;
  outputIndex: string;
  ref: string;
  lovelace: string;
};

/** UTxOs en la dirección del pool cuyo datum `owner` coincide con la wallet de la seed. */
export async function listPoolDepositsOnChain(): Promise<PoolOnChainPositionRow[]> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  const client = createPreprodSigningClient(mnemonic);
  const userAddr = await client.address();
  const ownerHex = Buffer.from(paymentKeyHashBytes(userAddr)).toString("hex");

  const bp = loadBlueprint();
  const val = liquidityPoolSpendValidator(bp);
  const poolAddr = enterpriseVaultAddress(val.hash);
  const utxos = await client.getUtxos(poolAddr);

  const rows: PoolOnChainPositionRow[] = [];
  for (const u of utxos) {
    try {
      const d = readInlineDatum(u);
      const oh = decodePoolDatumOwnerHex(d);
      if (oh.toLowerCase() !== ownerHex.toLowerCase()) continue;
      rows.push({
        txHash: TransactionHash.toHex(u.transactionId),
        outputIndex: u.index.toString(),
        ref: `${TransactionHash.toHex(u.transactionId)}#${u.index}`,
        lovelace: u.assets.lovelace.toString(),
      });
    } catch {
      /* datum distinto o hash-only */
    }
  }
  return rows;
}

/**
 * Gasta todos los UTxOs del pool con tu `owner` en el datum y devuelve los activos a la wallet.
 */
export async function withdrawAllLiquidityPoolOnChain(): Promise<{
  txHash: string;
  withdrawnLovelace: string;
  inputCount: number;
}> {
  const mnemonic = requireEnv("CARDANO_MNEMONIC");
  const client = createPreprodSigningClient(mnemonic);
  const recv = await client.address();
  const ownerHex = Buffer.from(paymentKeyHashBytes(recv)).toString("hex");

  const bp = loadBlueprint();
  const val = liquidityPoolSpendValidator(bp);
  const poolAddr = enterpriseVaultAddress(val.hash);
  const script = poolPlutusV3();

  const utxos = await client.getUtxos(poolAddr);
  const mine: UTxO[] = [];
  for (const u of utxos) {
    try {
      const d = readInlineDatum(u);
      if (decodePoolDatumOwnerHex(d).toLowerCase() !== ownerHex.toLowerCase()) {
        continue;
      }
      mine.push(u);
    } catch {
      /* skip */
    }
  }
  if (mine.length === 0) {
    throw new Error(
      "No hay UTxOs en el pool con datum.owner = tu payment key (depositá on-chain primero).",
    );
  }

  let merged = Assets.zero;
  for (const u of mine) {
    merged = Assets.merge(merged, u.assets);
  }

  const now = BigInt(Date.now());
  const built = await client
    .newTx()
    .setValidity({ from: now - 60_000n, to: now + 120_000n })
    .collectFrom({ inputs: mine, redeemer: redeemerPoolSpend() })
    .payToAddress({ address: recv, assets: merged })
    .attachScript({ script })
    .build();

  const digest = await built.signAndSubmit();
  return {
    txHash: TransactionHash.toHex(digest),
    withdrawnLovelace: merged.lovelace.toString(),
    inputCount: mine.length,
  };
}
