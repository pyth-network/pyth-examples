/**
 * tx.tsx – client-side Cardano transaction builders.
 *
 * depositA: Player A creates a duel (partial sign → backend co-signs + submits)
 * depositB: Player B joins a duel  (partial sign → backend co-signs + submits)
 *
 * Both require backend co-signature because the NFT mint policy checks backend_pkh.
 *
 * Resolve is fully backend-side (see /api/onchain/resolve.ts).
 */

import {
  MeshTxBuilder,
  applyParamsToScript,
  mConStr0,
  mConStr1,
  resolvePaymentKeyHash,
  resolveScriptHash,
  resolveSlotNo,
  serializePlutusScript,
} from "@meshsdk/core";
import { bech32 } from "bech32";

// ─── Types ────────────────────────────────────────────────────────────────────

type TxInputRef = { txHash: string; outputIndex: number };

type UtxoLike = {
  input: TxInputRef;
  output: { amount: Array<{ unit: string; quantity: string }> };
};

type ProviderLike = {
  fetchTxInfo?: (txHash: string) => Promise<unknown>;
};

type WalletLike = {
  signTx: (unsignedTx: string, partialSign?: boolean) => Promise<string>;
  submitTx: (signedTx: string) => Promise<string>;
};

type PlutusValidator = { title: string; compiledCode: string };
type PlutusJson = { validators: PlutusValidator[] };

// ─── Exported param / result types ───────────────────────────────────────────

export type DepositAParams = {
  provider: ProviderLike;
  wallet: WalletLike;
  utxos: UtxoLike[];
  playerOneAddress: string;
  playerPkh?: string;
  backendPkh: string;
  pythPolicyId: string;
  plutus: PlutusJson;
  feedA?: number;
  bet_lovelace: number;
  network?: "preprod" | "preview" | "mainnet";
  networkId?: 0 | 1;
};

export type DepositAResult = {
  partiallySignedTx: string;
  duelId: string;
  scriptAddress: string;
  spendScriptHash: string;
  mintPolicyId: string;
};

export type DepositBParams = {
  provider: ProviderLike;
  wallet: WalletLike;
  utxos: UtxoLike[];
  playerTwoAddress: string;
  playerTwoPkh?: string;
  playerOnePkh: string;
  depositATxHash: string;
  depositATxIndex: number;
  duelId: string;
  backendPkh: string;
  pythPolicyId: string;
  blockfrostId: string;
  signedUpdateHex: string; // from /api/onchain/pyth-lazer-prices
  startPriceA: number;     // raw Lazer price integer for feed A
  startPriceB: number;     // raw Lazer price integer for feed B
  plutus: PlutusJson;
  feedA: number;
  feedB: number;
  bet_lovelace: number;
  duelDuration: number;
  network?: "preprod" | "preview" | "mainnet";
  networkId?: 0 | 1;
};

export type DepositBResult = {
  partiallySignedTx: string;
  deadlinePosix: number;
  startPriceA: number;
  startPriceB: number;
  scriptAddress: string;
  spendScriptHash: string;
  mintPolicyId: string;
};

// ─── CBOR / script helpers ────────────────────────────────────────────────────

// Encode a hex string as a single CBOR byte-string (used for applyParamsToScript only).
const cborBytesParam = (hex: string) => {
  const len = hex.length / 2;
  if (len < 24) return (0x40 | len).toString(16).padStart(2, "0") + hex;
  if (len < 256) return "58" + len.toString(16).padStart(2, "0") + hex;
  return (
    "59" +
    (len >> 8).toString(16).padStart(2, "0") +
    (len & 0xff).toString(16).padStart(2, "0") +
    hex
  );
};

// ─── Plutus data helpers ──────────────────────────────────────────────────────

const someD = (inner: unknown) => mConStr0([inner as never]);
const noneD = () => mConStr1([]);

const playerD = ({
  pkh,
  feedId,
  startPrice,
}: {
  pkh: string;
  feedId: number;
  startPrice: number | null;
}) => mConStr0([pkh, feedId, startPrice != null ? someD(startPrice) : noneD()]);

const duelDatumD = ({
  duelId,
  playerA,
  playerB,
  betLovelace,
  statusIdx = 0,
  deadline = null,
}: {
  duelId: string;
  playerA: { pkh: string; feedId: number; startPrice: number | null };
  playerB?: { pkh: string; feedId: number; startPrice: number | null } | null;
  betLovelace: number;
  statusIdx?: number;
  deadline?: number | null;
}) =>
  mConStr0([
    duelId,
    playerD(playerA),
    playerB ? someD(playerD(playerB)) : noneD(),
    betLovelace,
    statusIdx === 0 ? mConStr0([]) : mConStr1([]),
    deadline != null ? someD(deadline) : noneD(),
  ]);

const outputRefD = (txHash: string, index: number) => mConStr0([txHash, index]);

// ─── Utility ──────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function u64beBytes(value: number): Uint8Array {
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, BigInt(value));
  return new Uint8Array(view.buffer);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return bytesToHex(new Uint8Array(digest));
}

async function computeDuelId(txHash: string, outputIndex: number): Promise<string> {
  const txHashBytes = hexToBytes(txHash);
  const indexBytes = u64beBytes(outputIndex);
  const combined = new Uint8Array(txHashBytes.length + indexBytes.length);
  combined.set(txHashBytes, 0);
  combined.set(indexBytes, txHashBytes.length);
  return sha256Hex(combined);
}

function getCompiledCode(plutus: PlutusJson, title: string): string {
  const code = plutus.validators.find((v) => v.title === title)?.compiledCode;
  if (!code) throw new Error(`Missing compiled code for: ${title}`);
  return code;
}

function deriveBetScripts({
  backendPkh,
  pythPolicyId,
  plutus,
  networkId,
}: {
  backendPkh: string;
  pythPolicyId: string;
  plutus: PlutusJson;
  networkId: 0 | 1;
}) {
  const mintScriptCbor = applyParamsToScript(
    getCompiledCode(plutus, "nft.nft_policy.mint"),
    [cborBytesParam(backendPkh)],
    "CBOR",
  );
  const mintPolicyId = resolveScriptHash(mintScriptCbor, "V3");

  const spendScriptCbor = applyParamsToScript(
    getCompiledCode(plutus, "validators.bet.spend"),
    [
      cborBytesParam(backendPkh),
      cborBytesParam(mintPolicyId),
      cborBytesParam(pythPolicyId),
    ],
    "CBOR",
  );
  const spendScriptHash = resolveScriptHash(spendScriptCbor, "V3");
  const scriptAddress = serializePlutusScript(
    { code: spendScriptCbor, version: "V3" },
    undefined,
    networkId,
    false,
  ).address;

  return { mintScriptCbor, mintPolicyId, spendScriptCbor, spendScriptHash, scriptAddress };
}

// Find a collateral UTxO that contains only lovelace (Cardano requirement).
function findPureAdaUtxo(utxos: UtxoLike[]): TxInputRef {
  const found = utxos.find(
    (u) =>
      u.output.amount.length === 1 && u.output.amount[0]?.unit === "lovelace",
  );
  if (!found)
    throw new Error(
      "No pure-ADA UTxO for collateral. Send a small ADA-only UTxO to your wallet.",
    );
  return found.input;
}

function scriptHashToRewardAddress(hash: string, networkId = 0): string {
  const header = networkId === 0 ? 0xf0 : 0xf1;
  const bytes = new Uint8Array(1 + hash.length / 2);
  bytes[0] = header;
  bytes.set(hexToBytes(hash), 1);
  return bech32.encode(
    networkId === 0 ? "stake_test" : "stake",
    bech32.toWords(bytes),
    200,
  );
}

function utf8ToHex(value: string): string {
  return Array.from(new TextEncoder().encode(value))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getBlockfrostBaseUrl(network: "preprod" | "preview" | "mainnet"): string {
  if (network === "mainnet") return "https://cardano-mainnet.blockfrost.io/api/v0";
  if (network === "preview") return "https://cardano-preview.blockfrost.io/api/v0";
  return "https://cardano-preprod.blockfrost.io/api/v0";
}

async function resolvePythState({
  blockfrostId,
  pythPolicyId,
  network,
}: {
  blockfrostId: string;
  pythPolicyId: string;
  network: "preprod" | "preview" | "mainnet";
}) {
  const base = getBlockfrostBaseUrl(network);
  const headers = { project_id: blockfrostId };
  const unit = pythPolicyId + utf8ToHex("Pyth State");

  const addrRes = await fetch(`${base}/assets/${unit}/addresses`, { headers });
  if (!addrRes.ok) throw new Error(`Pyth state lookup failed: ${await addrRes.text()}`);
  const addresses = (await addrRes.json()) as Array<{ address: string }>;
  if (!addresses[0]?.address) throw new Error("Pyth state address not found");

  const utxoRes = await fetch(
    `${base}/addresses/${addresses[0].address}/utxos/${unit}`,
    { headers },
  );
  if (!utxoRes.ok) throw new Error(`Pyth UTxO lookup failed: ${await utxoRes.text()}`);
  const utxos = (await utxoRes.json()) as Array<{
    tx_hash: string;
    output_index: number;
    data_hash?: string;
  }>;
  const stateUtxo = utxos[0];
  if (!stateUtxo) throw new Error("Pyth state UTxO not found");

  let datum: unknown;
  if (stateUtxo.data_hash) {
    const r = await fetch(`${base}/scripts/datum/${stateUtxo.data_hash}`, { headers });
    if (r.ok) datum = ((await r.json()) as { json_value?: unknown }).json_value;
  }
  if (!datum) {
    const r = await fetch(`${base}/txs/${stateUtxo.tx_hash}/utxos`, { headers });
    if (!r.ok) throw new Error(`Pyth tx lookup failed: ${await r.text()}`);
    const payload = (await r.json()) as {
      outputs?: Array<{ output_index: number; inline_datum?: unknown }>;
    };
    datum = payload.outputs?.find((o) => o.output_index === stateUtxo.output_index)?.inline_datum;
  }
  if (!datum || typeof datum !== "object") throw new Error("Pyth datum not found");

  const fields = (
    datum as {
      fields?: Array<{ bytes?: string }>;
      constructor?: { fields?: Array<{ bytes?: string }> };
    }
  ).fields ?? (datum as { constructor?: { fields?: Array<{ bytes?: string }> } }).constructor?.fields;

  if (!fields || fields.length < 4 || !fields[3]?.bytes) {
    throw new Error("Unexpected Pyth datum shape");
  }

  const withdrawScriptHash = fields[3].bytes;
  const scriptRes = await fetch(`${base}/scripts/${withdrawScriptHash}/cbor`, { headers });
  if (!scriptRes.ok) throw new Error(`Pyth script CBOR lookup failed: ${await scriptRes.text()}`);
  const scriptPayload = (await scriptRes.json()) as { cbor?: string };
  if (!scriptPayload.cbor) throw new Error("Missing Pyth script CBOR");

  return {
    txHash: stateUtxo.tx_hash,
    txIndex: stateUtxo.output_index,
    withdrawScriptHash,
    scriptSize: scriptPayload.cbor.length / 2,
  };
}

// ─── depositA ─────────────────────────────────────────────────────────────────

export async function depositA({
  provider,
  wallet,
  utxos,
  playerOneAddress,
  playerPkh,
  backendPkh,
  pythPolicyId,
  plutus,
  feedA = 16,
  bet_lovelace,
  network = "preprod",
  networkId = 0,
}: DepositAParams): Promise<DepositAResult> {
  if (!utxos.length) throw new Error("No UTxOs available in wallet");
  if (!Number.isFinite(bet_lovelace) || bet_lovelace <= 0)
    throw new Error("bet_lovelace must be a positive number");

  const playerOnePkh =
    playerPkh?.trim() || resolvePaymentKeyHash(playerOneAddress);

  const { mintScriptCbor, mintPolicyId, spendScriptHash, scriptAddress } =
    deriveBetScripts({ backendPkh, pythPolicyId, plutus, networkId });

  const seed = utxos[0].input;
  const collateral = findPureAdaUtxo(utxos);
  const duelId = await computeDuelId(seed.txHash, seed.outputIndex);

  const datum = duelDatumD({
    duelId,
    playerA: { pkh: playerOnePkh, feedId: feedA, startPrice: null },
    betLovelace: bet_lovelace,
  });

  const mintRedeemer = mConStr0([outputRefD(seed.txHash, seed.outputIndex)]);
  const nowSlot = resolveSlotNo(network, Date.now());

  let tx = new MeshTxBuilder({ fetcher: provider as never, submitter: provider as never });
  tx = tx.invalidBefore(Number(nowSlot) - 600);
  tx = tx.invalidHereafter(Number(nowSlot) + 600);
  tx = tx.txInCollateral(collateral.txHash, collateral.outputIndex);
  tx = tx.txIn(seed.txHash, seed.outputIndex);
  tx = tx.mintPlutusScriptV3();
  tx = tx.mint("1", mintPolicyId, duelId);
  tx = tx.mintingScript(mintScriptCbor);
  tx = tx.mintRedeemerValue(mintRedeemer);
  tx = tx.requiredSignerHash(backendPkh);
  tx = tx.txOut(scriptAddress, [
    { unit: "lovelace", quantity: String(bet_lovelace) },
    { unit: mintPolicyId + duelId, quantity: "1" },
  ]);
  tx = tx.txOutInlineDatumValue(datum);
  tx = tx.changeAddress(playerOneAddress);
  tx = tx.selectUtxosFrom(utxos as never);

  console.log("[depositA] building tx...");
  const unsigned = await tx.complete();
  console.log("[depositA] requesting wallet partial signature...");
  const partiallySignedTx = await wallet.signTx(unsigned, true);
  console.log("[depositA] partial signature ok");

  return { partiallySignedTx, duelId, scriptAddress, spendScriptHash, mintPolicyId };
}

// ─── depositB ─────────────────────────────────────────────────────────────────

export async function depositB({
  provider,
  wallet,
  utxos,
  playerTwoAddress,
  playerTwoPkh,
  playerOnePkh,
  depositATxHash,
  depositATxIndex,
  duelId,
  backendPkh,
  pythPolicyId,
  blockfrostId,
  signedUpdateHex,
  startPriceA,
  startPriceB,
  plutus,
  feedA,
  feedB,
  bet_lovelace,
  duelDuration,
  network = "preprod",
  networkId = 0,
}: DepositBParams): Promise<DepositBResult> {
  if (!utxos.length) throw new Error("No UTxOs available in wallet");

  const playerB_pkh = playerTwoPkh?.trim() || resolvePaymentKeyHash(playerTwoAddress);

  const { mintPolicyId, spendScriptCbor, spendScriptHash, scriptAddress } =
    deriveBetScripts({ backendPkh, pythPolicyId, plutus, networkId });

  const pythState = await resolvePythState({ blockfrostId, pythPolicyId, network });
  const pythRewardAddress = scriptHashToRewardAddress(pythState.withdrawScriptHash, networkId);

  const deadlinePosix = Date.now() + duelDuration;
  const totalPot = bet_lovelace * 2;

  const newDatum = duelDatumD({
    duelId,
    playerA: { pkh: playerOnePkh, feedId: feedA, startPrice: startPriceA },
    playerB: { pkh: playerB_pkh, feedId: feedB, startPrice: startPriceB },
    betLovelace: bet_lovelace,
    statusIdx: 1,
    deadline: deadlinePosix,
  });

  const joinRedeemer = mConStr0([playerB_pkh, feedB]);
  const collateral = findPureAdaUtxo(utxos);
  const nowSlot = resolveSlotNo(network, Date.now());

  const tx = new MeshTxBuilder({ fetcher: provider as never, submitter: provider as never });

  tx
    .invalidBefore(Number(nowSlot) - 600)
    .invalidHereafter(Number(nowSlot) + 600)
    .txInCollateral(collateral.txHash, collateral.outputIndex)
    .requiredSignerHash(backendPkh)

    // Pyth zero-withdrawal: redeemer is a plain JS array → MeshJS handles chunking
    .withdrawalPlutusScriptV3()
    .withdrawal(pythRewardAddress, "0")
    .withdrawalTxInReference(
      pythState.txHash,
      pythState.txIndex,
      String(pythState.scriptSize),
      pythState.withdrawScriptHash,
    )
    .withdrawalRedeemerValue([signedUpdateHex])

    // Spend the DepositA UTxO (Waiting → Active)
    .spendingPlutusScriptV3()
    .txIn(depositATxHash, depositATxIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue(joinRedeemer)
    .txInScript(spendScriptCbor)

    // Output: 2× bet + NFT at script with Active datum
    .txOut(scriptAddress, [
      { unit: "lovelace", quantity: String(totalPot) },
      { unit: mintPolicyId + duelId, quantity: "1" },
    ])
    .txOutInlineDatumValue(newDatum)

    .changeAddress(playerTwoAddress)
    .selectUtxosFrom(utxos as never);

  console.log("[depositB] building tx...");
  const unsigned = await tx.complete();
  console.log("[depositB] requesting wallet partial signature...");
  const partiallySignedTx = await wallet.signTx(unsigned, true);
  console.log("[depositB] partial signature ok");

  return {
    partiallySignedTx,
    deadlinePosix,
    startPriceA,
    startPriceB,
    scriptAddress,
    spendScriptHash,
    mintPolicyId,
  };
}
