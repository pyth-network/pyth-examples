/**
 * depositB.mjs
 *
 * Step 2 of the Duelo de Traders flow: Player B joins a waiting duel.
 *
 * This transaction:
 *   1. Fetches verified Pyth prices (ADA/USD and BTC/USD)
 *   2. Performs a zero-ADA withdrawal from the Pyth script to verify prices on-chain
 *   3. Spends the DepositA UTxO (Waiting datum) from the bet validator
 *   4. Produces a new UTxO at the bet script with an Active datum, recording start prices
 *
 * Required .env vars:
 *   PYTH_TOKEN         – Pyth Lazer API token
 *   BLOCKFROST_ID      – Blockfrost project ID (preprod)
 *   PYTH_POLICY_ID     – PolicyId of the Pyth on-chain state NFT
 *   BACKEND_PKH        – Payment key hash of the backend wallet
 *   MNEMONIC           – Space-separated wallet mnemonic
 *   DEPOSIT_A_TX_HASH  – TxHash of the DepositA UTxO to spend
 *   DEPOSIT_A_TX_INDEX – Output index of the DepositA UTxO (default: 0)
 *   DUEL_ID            – The duel ID hex (from depositA output)
 *   PLAYER_A_PKH       – Payment key hash of Player A
 *   PLAYER_B_PKH       – Payment key hash of Player B (the joiner)
 */

import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import {
  BlockfrostProvider,
  MeshWallet,
  MeshTxBuilder,
  resolveScriptHash,
  serializePlutusScript,
  applyParamsToScript,
  mConStr0,
  mConStr1,
  resolveSlotNo,
} from "@meshsdk/core";
import { bech32 } from "bech32";
import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DUEL_STATE_FILE = resolve(__dirname, "../duel-state.json");

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const required = (name) => {
  const v = process.env[name];
  if (!v) { console.error(`Missing env var: ${name}`); process.exit(1); }
  return v;
};

const PYTH_TOKEN     = required("PYTH_TOKEN");
const BLOCKFROST_ID  = required("BLOCKFROST_ID");
const PYTH_POLICY_ID = required("PYTH_POLICY_ID");
const BACKEND_PKH    = required("BACKEND_PKH");
const MNEMONIC       = required("MNEMONIC").split(" ");
// const PLAYER_B_PKH   = required("PLAYER_B_PKH");
const playerB_pkh = "bb".repeat(28); // TODO: parameter. same as in depositA

// State persisted by depositA
let duelState;
try {
  duelState = JSON.parse(readFileSync(DUEL_STATE_FILE, "utf8"));
} catch {
  console.error("duel-state.json not found — run depositA first.");
  process.exit(1);
}
const DEPOSIT_A_TX_HASH  = duelState.txHash;
const DEPOSIT_A_TX_INDEX = duelState.txIndex ?? 0;
const DUEL_ID            = duelState.duelId;
const PLAYER_A_PKH       = duelState.playerA_pkh;

const FEED_A = 16;  // ADA/USD. TODO: parameter.
const FEED_B = 29;  // BTC/USD TODO: parameter
const BET_LOVELACE = 5_000_000; // 5 ADA. TODO: parameter
const DUEL_DURATION_MS = 30_000; // 30 seconds for testing. TODO: change.

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPT SETUP
// ═══════════════════════════════════════════════════════════════════════════

const cborBytesParam = (hex) => {
  const len = hex.length / 2;
  if (len < 24)  return (0x40 | len).toString(16).padStart(2, "0") + hex;
  if (len < 256) return "58" + len.toString(16).padStart(2, "0") + hex;
  return "59" + (len >> 8).toString(16).padStart(2, "0") + (len & 0xff).toString(16).padStart(2, "0") + hex;
};

const plutus = JSON.parse(readFileSync(
  new URL("../../pyth-coin-stable-validators/plutus.json", import.meta.url), "utf8"
));
const NFT_COMPILED_CODE = plutus.validators.find((v) => v.title === "nft.nft_policy.mint").compiledCode;
const BET_COMPILED_CODE = plutus.validators.find((v) => v.title === "validators.bet.spend").compiledCode;

const mintScriptCbor  = applyParamsToScript(NFT_COMPILED_CODE, [cborBytesParam(BACKEND_PKH)], "CBOR");
const mintPolicyId    = resolveScriptHash(mintScriptCbor, "V3");

const spendScriptCbor = applyParamsToScript(BET_COMPILED_CODE, [
  cborBytesParam(BACKEND_PKH),
  cborBytesParam(mintPolicyId),
  cborBytesParam(PYTH_POLICY_ID),
], "CBOR");
const scriptAddress = serializePlutusScript(
  { code: spendScriptCbor, version: "V3" },
  undefined, 0, false,
).address;

console.log("Mint policy ID:  ", mintPolicyId);
console.log("Script address:  ", scriptAddress);
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// PYTH HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const PYTH_STATE_ASSET_NAME = Buffer.from("Pyth State", "utf-8").toString("hex");

function scriptHashToRewardAddress(hash, networkId = 0) {
  const header = networkId === 0 ? 0xf0 : 0xf1;
  const bytes = Buffer.concat([Buffer.from([header]), Buffer.from(hash, "hex")]);
  return bech32.encode(networkId === 0 ? "stake_test" : "stake", bech32.toWords(bytes), 200);
}

async function resolvePythState() {
  const base = "https://cardano-preprod.blockfrost.io/api/v0";
  const headers = { project_id: BLOCKFROST_ID };
  const unit = PYTH_POLICY_ID + PYTH_STATE_ASSET_NAME;

  const addrRes = await fetch(`${base}/assets/${unit}/addresses`, { headers });
  if (!addrRes.ok) throw new Error(`Pyth state lookup: ${await addrRes.text()}`);
  const [{ address }] = await addrRes.json();

  const utxoRes = await fetch(`${base}/addresses/${address}/utxos/${unit}`, { headers });
  if (!utxoRes.ok) throw new Error(`Pyth UTxO lookup: ${await utxoRes.text()}`);
  const stateUtxo = (await utxoRes.json())[0];

  let datum;
  if (stateUtxo.data_hash) {
    const r = await fetch(`${base}/scripts/datum/${stateUtxo.data_hash}`, { headers });
    if (r.ok) datum = (await r.json()).json_value;
  }
  if (!datum) {
    const r = await fetch(`${base}/txs/${stateUtxo.tx_hash}/utxos`, { headers });
    const d = await r.json();
    datum = d.outputs.find((o) => o.output_index === stateUtxo.output_index)?.inline_datum;
  }
  if (!datum) throw new Error("No Pyth state datum");

  const fields = datum?.fields ?? datum?.constructor?.fields;
  if (!fields || fields.length < 4) throw new Error("Bad datum shape");

  const withdrawScriptHash = fields[3].bytes;
  const scriptRes = await fetch(`${base}/scripts/${withdrawScriptHash}/cbor`, { headers });
  if (!scriptRes.ok) throw new Error(`Pyth script CBOR: ${await scriptRes.text()}`);
  const scriptSize = (await scriptRes.json()).cbor.length / 2;

  return { txHash: stateUtxo.tx_hash, txIndex: stateUtxo.output_index, withdrawScriptHash, scriptSize };
}

async function fetchSignedPrices(feedIds) {
  const client = await PythLazerClient.create({ token: PYTH_TOKEN, webSocketPoolConfig: {} });
  const resp = await client.getLatestPrice({
    priceFeedIds: feedIds,
    properties: ["price", "exponent"],
    channel: "fixed_rate@200ms",
    formats: ["solana"],
    jsonBinaryEncoding: "hex",
    parsed: true,
  });
  client.shutdown();
  if (!resp.solana?.data) throw new Error("No Pyth payload");
  return {
    signedUpdate: Buffer.from(resp.solana.data, "hex"),
    parsedPrices: (resp.parsed?.priceFeeds ?? []).map((f) => ({
      feedId: f.priceFeedId, price: Number(f.price), exponent: Number(f.exponent),
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PLUTUS DATA HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const someD = (inner) => mConStr0([inner]);
const noneD = () => mConStr1([]);

const playerD = ({ pkh, feedId, startPrice }) =>
  mConStr0([pkh, feedId, startPrice != null ? someD(startPrice) : noneD()]);

const duelDatumD = ({ duelId, playerA, playerB, betLovelace, statusIdx, deadline }) =>
  mConStr0([
    duelId,
    playerD(playerA),
    playerB ? someD(playerD(playerB)) : noneD(),
    betLovelace,
    statusIdx === 0 ? mConStr0([]) : mConStr1([]),
    deadline != null ? someD(deadline) : noneD(),
  ]);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("═══ DepositB (Join) ═══\n");

  // 1. Resolve Pyth state
  console.log("  Resolving Pyth state...");
  const pythState = await resolvePythState();
  const pythRewardAddr = scriptHashToRewardAddress(pythState.withdrawScriptHash, 0);
  console.log(`  Pyth state: ${pythState.txHash}#${pythState.txIndex}`);

  // 2. Fetch starting prices
  console.log("  Fetching starting prices...");
  const { signedUpdate, parsedPrices } = await fetchSignedPrices([FEED_A, FEED_B]);

  const priceA = parsedPrices.find((p) => p.feedId === FEED_A);
  const priceB = parsedPrices.find((p) => p.feedId === FEED_B);

  // Store raw price integer — matches what get_price_from_pyth returns on-chain
  const scaledA = priceA.price;
  const scaledB = priceB.price;
  console.log(`  ADA/USD: ${priceA.price} (exp=${priceA.exponent})`);
  console.log(`  BTC/USD: ${priceB.price} (exp=${priceB.exponent})`);

  const deadlinePosix = Date.now() + DUEL_DURATION_MS;
  const totalPot = BET_LOVELACE * 2;

  // 3. Build new Active datum
  const newDatum = duelDatumD({
    duelId:      DUEL_ID,
    playerA:     { pkh: PLAYER_A_PKH, feedId: FEED_A, startPrice: scaledA },
    playerB:     { pkh: playerB_pkh, feedId: FEED_B, startPrice: scaledB },
    betLovelace: BET_LOVELACE,
    statusIdx:   1, // Active
    deadline:    deadlinePosix,
  });

  console.log("\n  New datum (Active):");
  console.log(`    duel_id:     ${DUEL_ID}`);
  console.log(`    player_a:    pkh=${PLAYER_A_PKH}  feed_id=${FEED_A}  start_price=${scaledA}`);
  console.log(`    player_b:    pkh=${playerB_pkh}  feed_id=${FEED_B}  start_price=${scaledB}`);
  console.log(`    bet_lovelace:${BET_LOVELACE}`);
  console.log(`    status:      Active (1)`);
  console.log(`    deadline:    ${new Date(deadlinePosix).toISOString()}`);
  console.log();

  // Join redeemer: Join { player_pkh, feed_id }
  const joinRedeemer = mConStr0([playerB_pkh, FEED_B]);

  // 4. Setup wallet
  const provider = new BlockfrostProvider(BLOCKFROST_ID);
  const wallet = new MeshWallet({
    networkId: 0,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words: MNEMONIC },
  });

  const address = (await wallet.getUsedAddresses())[0];
  const utxos = await wallet.getUtxos();
  console.log(`  Wallet: ${address}`);
  console.log(`  UTxOs: ${utxos.length}\n`);

  if (utxos.length === 0) {
    console.log("No UTxOs. Fund this address with preprod tADA.");
    process.exit(0);
  }

  // 5. Build transaction
  const nowSlot = resolveSlotNo("preprod", Date.now());
  const tx = new MeshTxBuilder({ fetcher: provider, submitter: provider });

  tx
    .invalidBefore(Number(nowSlot) - 600)
    .invalidHereafter(Number(nowSlot) + 600)
    .txInCollateral(utxos[0].input.txHash, utxos[0].input.outputIndex)
    .requiredSignerHash(BACKEND_PKH)

    // Pyth zero-withdrawal
    .withdrawalPlutusScriptV3()
    .withdrawal(pythRewardAddr, "0")
    .withdrawalTxInReference(pythState.txHash, pythState.txIndex, pythState.scriptSize, pythState.withdrawScriptHash)
    .withdrawalRedeemerValue([signedUpdate.toString("hex")])

    // Spend the DepositA UTxO
    .spendingPlutusScriptV3()
    .txIn(DEPOSIT_A_TX_HASH, DEPOSIT_A_TX_INDEX)
    .txInInlineDatumPresent()
    .txInRedeemerValue(joinRedeemer)
    .txInScript(spendScriptCbor)

    // Output: 2× bet + NFT → script with Active datum
    .txOut(scriptAddress, [
      { unit: "lovelace", quantity: String(totalPot) },
      { unit: mintPolicyId + DUEL_ID, quantity: "1" },
    ])
    .txOutInlineDatumValue(newDatum)

    .changeAddress(address)
    .selectUtxosFrom(utxos);

  console.log("  Building transaction...");
  const unsigned = await tx.complete();
  const signed = await wallet.signTx(unsigned);
  const txHash = await wallet.submitTx(signed);

  const updatedState = { ...duelState, depositB_txHash: txHash, depositB_txIndex: 0, deadline: deadlinePosix, startPriceA: scaledA, startPriceB: scaledB };
  writeFileSync(DUEL_STATE_FILE, JSON.stringify(updatedState, null, 2));

  console.log("\n  TX submitted:", txHash);
  console.log("  https://preprod.cardanoscan.io/transaction/" + txHash);
  console.log(`  Deadline: ${new Date(deadlinePosix).toISOString()}`);
  console.log("  Duel state saved to duel-state.json");
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
