/**
 * testFlow.mjs
 *
 * End-to-end test of the Duelo de Traders transaction flow
 * using always-true validators as placeholders.
 *
 * Flow:
 *   1. DepositA – Player A creates a duel (mint NFT + send ADA to script)
 *   2. DepositB – Player B joins (consume Waiting → create Active, Pyth prices)
 *   3. Resolve  – Backend resolves (consume Active → pay winner, mint victory token)
 *
 * All three use the same wallet (for testing). In production they'd be separate.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Setup:
 *
 *   1. Add always_true.ak to your Aiken project, run `aiken build`
 *   2. From plutus.json, grab the compiledCode for:
 *        always_true_spend.spend → spendScriptDouble
 *        always_true_mint.mint   → mintScriptDouble
 *   3. Put them in .env (see below)
 *   4. Fund the wallet with preprod tADA
 *   5. Run: node testFlow.mjs
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * .env:
 *
 *   PYTH_TOKEN=...
 *   BLOCKFROST_ID=...
 *   PYTH_POLICY_ID=...
 *   spendScriptDouble=...    (from plutus.json → always_true_spend)
 *   mintScriptDouble=...     (from plutus.json → always_true_mint)
 */

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
import { createHash } from "crypto";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
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

const BLOCKFROST_ID    = required("BLOCKFROST_ID");
const PYTH_POLICY_ID   = required("PYTH_POLICY_ID");
const BACKEND_PKH      = required("BACKEND_PKH");
const MNEMONIC           = required("MNEMONIC").split(" ");


const FEED_A = 16;  // ADA/USD. TODO: parameter
const BET_LOVELACE = 5_000_000; // 5 ADA. TODO: parameter

// ═══════════════════════════════════════════════════════════════════════════
// SCRIPT SETUP — apply parameters to real validators
// ═══════════════════════════════════════════════════════════════════════════

// Encode a hex string as a CBOR bytes param for applyParamsToScript("CBOR")
const cborBytesParam = (hex) => {
  const len = hex.length / 2;
  if (len < 24)  return (0x40 | len).toString(16).padStart(2, "0") + hex;
  if (len < 256) return "58" + len.toString(16).padStart(2, "0") + hex;
  return "59" + (len >> 8).toString(16).padStart(2, "0") + (len & 0xff).toString(16).padStart(2, "0") + hex;
};

// Load compiledCode from plutus.json
const { readFileSync: _readFileSync } = await import("fs");
const _plutus = JSON.parse(_readFileSync(
  new URL("../../pyth-coin-stable-validators/plutus.json", import.meta.url), "utf8"
));
const NFT_COMPILED_CODE = _plutus.validators.find((v) => v.title === "nft.nft_policy.mint").compiledCode;
const BET_COMPILED_CODE = _plutus.validators.find((v) => v.title === "validators.bet.spend").compiledCode;

// nft_policy(backend_pkh)
const mintScriptCbor = applyParamsToScript(NFT_COMPILED_CODE, [cborBytesParam(BACKEND_PKH)], "CBOR");
const mintPolicyId   = resolveScriptHash(mintScriptCbor, "V3");

// bet(backend_pkh, nft_policy_id, pyth_id)
const spendScriptCbor = applyParamsToScript(BET_COMPILED_CODE, [
  cborBytesParam(BACKEND_PKH),
  cborBytesParam(mintPolicyId),
  cborBytesParam(PYTH_POLICY_ID),
], "CBOR");
const spendScriptHash = resolveScriptHash(spendScriptCbor, "V3");

const scriptAddress = serializePlutusScript(
  { code: spendScriptCbor, version: "V3" },
  undefined,
  0,
  false,
).address;

console.log("Spend script hash:", spendScriptHash);
console.log("Mint policy ID:", mintPolicyId);
console.log("Script address:", scriptAddress);
console.log();



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

// Aiken's TransactionId is a type alias for ByteArray (no constructor wrapper)
const outputRefD = (txHash, index) => mConStr0([txHash, index]);

function computeDuelId(txHash, outputIndex) {
  const txBuf = Buffer.from(txHash, "hex");
  // Aiken: bytearray.from_int_big_endian(output_index, 8) — always 8 bytes
  const idxBuf = Buffer.alloc(8);
  idxBuf.writeBigUInt64BE(BigInt(outputIndex));
  return createHash("sha256").update(Buffer.concat([txBuf, idxBuf])).digest("hex");
}


// ═══════════════════════════════════════════════════════════════════════════
// WALLET SETUP
// ═══════════════════════════════════════════════════════════════════════════

async function setupWallet(provider) {

  const wallet = new MeshWallet({
    networkId: 0,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words: MNEMONIC },
  });

  const address = (await wallet.getUsedAddresses())[0];
  const utxos = await wallet.getUtxos();
  console.log("Address:", address);
  console.log("UTxOs:", utxos.length, "\n");

  if (utxos.length === 0) {
    console.log("No UTxOs. Fund this address with preprod tADA:");
    console.log("  https://docs.cardano.org/cardano-testnets/tools/faucet/");
    process.exit(0);
  }

  return { wallet, address, utxos };
}

function sleep(ms) {
  console.log(`  Waiting ${ms / 1000}s...\n`);
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForTx(provider, txHash, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await provider.fetchTxInfo(txHash);
      return true;
    } catch {
      await sleep(5_000);
    }
  }
  throw new Error(`TX ${txHash} not confirmed after ${maxAttempts} attempts`);
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: DEPOSIT A
// ═══════════════════════════════════════════════════════════════════════════

async function depositA(provider, wallet, address, utxos, playerPkh) {
  console.log("═══ STEP 1: DepositA ═══\n");

  const seed = utxos[0].input;
  const duelId = computeDuelId(seed.txHash, seed.outputIndex);
  console.log("  Seed UTxO:", `${seed.txHash}#${seed.outputIndex}`);
  console.log("  Duel ID:", duelId);

  const datum = duelDatumD({
    duelId,
    playerA: { pkh: playerPkh, feedId: FEED_A, startPrice: null },
    playerB: null,
    betLovelace: BET_LOVELACE,
    statusIdx: 0,
    deadline: null,
  });

  console.log("  Datum sent to BET script:");
  console.log(`    duel_id:     ${duelId}`);
  console.log(`    player_a:    pkh=${playerPkh}  feed_id=${FEED_A}  start_price=None`);
  console.log(`    player_b:    None`);
  console.log(`    bet_lovelace:${BET_LOVELACE}`);
  console.log(`    status:      Waiting (0)`);
  console.log(`    deadline:    None`);
  console.log();

  const mintRedeemer = mConStr0([outputRefD(seed.txHash, seed.outputIndex)]);

  const nowSlot = resolveSlotNo("preprod", Date.now());

  let tx = new MeshTxBuilder({ fetcher: provider, submitter: provider });
  tx = tx.invalidBefore(Number(nowSlot) - 600); 
  tx = tx.invalidHereafter(Number(nowSlot) + 600); 
  tx = tx.txInCollateral(utxos[1].input.txHash, utxos[1].input.outputIndex); 
  tx = tx.txIn(seed.txHash, seed.outputIndex); 
  tx = tx.mintPlutusScriptV3(); 
  tx = tx.mint("1", mintPolicyId, duelId); 
  tx = tx.mintingScript(mintScriptCbor);
  tx = tx.mintRedeemerValue(mintRedeemer); 
  tx = tx.requiredSignerHash(BACKEND_PKH);
  tx = tx.txOut(scriptAddress, [
      { unit: "lovelace", quantity: String(BET_LOVELACE) },
      { unit: mintPolicyId + duelId, quantity: "1" },
  ]);
  tx = tx.txOutInlineDatumValue(datum); 
  tx = tx.changeAddress(address); 
  tx = tx.selectUtxosFrom(utxos); 

  const unsigned = await tx.complete();
  const signed = await wallet.signTx(unsigned);
  const txHash = await wallet.submitTx(signed);

  const state = {
    txHash,
    txIndex: 0,
    duelId,
    playerA_pkh: playerPkh,
    betLovelace: BET_LOVELACE,
    mintPolicyId,
    scriptAddress,
  };
  writeFileSync(DUEL_STATE_FILE, JSON.stringify(state, null, 2));

  console.log("  TX submitted:", txHash);
  console.log("  https://preprod.cardanoscan.io/transaction/" + txHash);
  console.log("  Duel state saved to duel-state.json");
  console.log();
  return { txHash, duelId };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN — RUN THE FULL FLOW
// ═══════════════════════════════════════════════════════════════════════════

async function main() {

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║    Duelo de Traders — End-to-End Test Flow      ║");
  console.log("║    Using always-true validators on preprod      ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const provider = new BlockfrostProvider(BLOCKFROST_ID);
  const { wallet, address, utxos } = await setupWallet(provider);

  // Use a fake PKH for testing (28 bytes = 56 hex chars)
  // In prod these come from the connected wallets
  const playerA_pkh = "aa".repeat(28);
//   

  // ── Step 1: DepositA ──
  const { txHash: depositATxHash, duelId } = await depositA(
    provider, wallet, address, utxos, playerA_pkh,
  );

  console.log("  Waiting for DepositA confirmation...");
  await waitForTx(provider, depositATxHash);
  console.log("  DepositA confirmed!\n");

  // Refresh UTxOs after DepositA
  const utxos2 = await wallet.getUtxos();
  console.log("UTxOs after DepositA:", utxos2.length, "\n");
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
