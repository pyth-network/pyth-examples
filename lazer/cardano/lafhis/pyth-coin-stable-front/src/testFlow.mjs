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
  resolvePaymentKeyHash,
} from "@meshsdk/core";
import { bech32 } from "bech32";
import { createHash } from "crypto";
import dotenv from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const WALLET_FILE = resolve(__dirname, "wallet.json");

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const required = (name) => {
  const v = process.env[name];
  if (!v) { console.error(`Missing env var: ${name}`); process.exit(1); }
  return v;
};

const PYTH_TOKEN       = required("PYTH_TOKEN");
const BLOCKFROST_ID    = required("BLOCKFROST_ID");
const PYTH_POLICY_ID   = required("PYTH_POLICY_ID");
const BACKEND_PKH      = required("BACKEND_PKH");
const MNEMONIC           = required("MNEMONIC").split(" ");


const FEED_A = 16;  // ADA/USD
const FEED_B = 29;  // BTC/USD
const BET_LOVELACE = 5_000_000; // 5 ADA

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

  return {
    txHash: stateUtxo.tx_hash,
    txIndex: stateUtxo.output_index,
    withdrawScriptHash,
    scriptSize,
  };
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
      feedId: f.priceFeedId, price: f.price, exponent: f.exponent,
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

// Aiken's TransactionId is a type alias for ByteArray (no constructor wrapper)
const outputRefD = (txHash, index) => mConStr0([txHash, index]);

function computeDuelId(txHash, outputIndex) {
  const txBuf = Buffer.from(txHash, "hex");
  // Aiken: bytearray.from_int_big_endian(output_index, 8) — always 8 bytes
  const idxBuf = Buffer.alloc(8);
  idxBuf.writeBigUInt64BE(BigInt(outputIndex));
  return createHash("sha256").update(Buffer.concat([txBuf, idxBuf])).digest("hex");
}

function pkhToAddress(pkh) {
  const bytes = Buffer.concat([Buffer.from([0x60]), Buffer.from(pkh, "hex")]);
  return bech32.encode("addr_test", bech32.toWords(bytes), 200);
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

  const mintRedeemer = mConStr0([outputRefD(seed.txHash, seed.outputIndex)]);

  const nowSlot = resolveSlotNo("preprod", Date.now());

  let tx = new MeshTxBuilder({ fetcher: provider, submitter: provider });

  console.log("  nowSlot:", nowSlot);
  tx = tx.invalidBefore(Number(nowSlot) - 60); 
  console.log("  ✓ invalidBefore");
  tx = tx.invalidHereafter(Number(nowSlot) + 60); 
  console.log("  ✓ invalidHereafter");
  tx = tx.txInCollateral(utxos[1].input.txHash, utxos[1].input.outputIndex); 
  console.log("  ✓ txInCollateral");
  tx = tx.txIn(seed.txHash, seed.outputIndex); 
  console.log("  ✓ txIn");
  tx = tx.mintPlutusScriptV3(); 
  console.log("  ✓ mintPlutusScriptV3");
  tx = tx.mint("1", mintPolicyId, duelId); 
  console.log("  ✓ mint", mintPolicyId, duelId);
  tx = tx.mintingScript(mintScriptDouble); 
  console.log("  ✓ mintingScript");
  tx = tx.mintRedeemerValue(mintRedeemer); 
  console.log("  ✓ mintRedeemerValue", JSON.stringify(mintRedeemer));
  tx = tx.txOut(scriptAddress, [
      { unit: "lovelace", quantity: String(BET_LOVELACE) },
      { unit: mintPolicyId + duelId, quantity: "1" },
  ]); console.log("  ✓ txOut");
  tx = tx.txOutInlineDatumValue(datum); 
  console.log("  ✓ txOutInlineDatumValue", JSON.stringify(datum));
  tx = tx.changeAddress(address); 
  console.log("  ✓ changeAddress");
  tx = tx.selectUtxosFrom(utxos); 
  console.log("  ✓ selectUtxosFrom");

  const unsigned = await tx.complete();
  const signed = await wallet.signTx(unsigned);
  const txHash = await wallet.submitTx(signed);

  console.log("  TX submitted:", txHash);
  console.log("  https://preprod.cardanoscan.io/transaction/" + txHash);
  console.log();
  return { txHash, duelId };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: DEPOSIT B (JOIN)
// ═══════════════════════════════════════════════════════════════════════════

async function depositB(provider, wallet, address, utxos, playerPkh, depositATxHash, depositATxIndex, duelId, playerA_pkh) {
  console.log("═══ STEP 2: DepositB (Join) ═══\n");

  // Pyth setup
  console.log("  Resolving Pyth state...");
  const pythState = await resolvePythState();
  const pythRewardAddr = scriptHashToRewardAddress(pythState.withdrawScriptHash, 0);
  console.log("  Pyth state:", `${pythState.txHash}#${pythState.txIndex}`);

  // Fetch starting prices
  console.log("  Fetching starting prices...");
  const { signedUpdate, parsedPrices } = await fetchSignedPrices([FEED_A, FEED_B]);

  const priceA = parsedPrices.find((p) => p.feedId === FEED_A);
  const priceB = parsedPrices.find((p) => p.feedId === FEED_B);
  const scaledA = Math.trunc(priceA.price * Math.pow(10, priceA.exponent));
  const scaledB = Math.trunc(priceB.price * Math.pow(10, priceB.exponent));
  console.log(`  ADA/USD: raw=${priceA.price} exp=${priceA.exponent} → ${scaledA}`);
  console.log(`  BTC/USD: raw=${priceB.price} exp=${priceB.exponent} → ${scaledB}`);

  const deadlinePosix = Date.now() + 60_000; // 1 minute duel
  const totalPot = BET_LOVELACE * 2;

  const newDatum = duelDatumD({
    duelId,
    playerA: { pkh: playerA_pkh, feedId: FEED_A, startPrice: scaledA },
    playerB: { pkh: playerPkh, feedId: FEED_B, startPrice: scaledB },
    betLovelace: BET_LOVELACE,
    statusIdx: 1, // Active
    deadline: deadlinePosix,
  });

  const joinRedeemer = mConStr0([playerPkh, FEED_B]);
  const nowSlot = resolveSlotNo("preprod", Date.now());

  const tx = new MeshTxBuilder({ fetcher: provider, submitter: provider });

  tx
    .invalidBefore(Number(nowSlot) - 60)
    .invalidHereafter(Number(nowSlot) + 60)

    .txInCollateral(utxos[0].input.txHash, utxos[0].input.outputIndex)

    // Pyth zero-withdrawal (state UTxO is both the reference input and the script source)
    .withdrawalPlutusScriptV3()
    .withdrawal(pythRewardAddr, "0")
    .withdrawalTxInReference(pythState.txHash, pythState.txIndex, pythState.scriptSize, pythState.withdrawScriptHash)
    .withdrawalRedeemerValue(mConStr0([signedUpdate.toString("hex")]))

    // Consume DepositA UTxO
    .spendingPlutusScriptV3()
    .txIn(depositATxHash, depositATxIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue(joinRedeemer)
    .txInScript(spendScriptDouble)

    // Output: 2× bet + NFT → script with ActiveDatum
    .txOut(scriptAddress, [
      { unit: "lovelace", quantity: String(totalPot) },
      { unit: mintPolicyId + duelId, quantity: "1" },
    ])
    .txOutInlineDatumValue(newDatum)

    .changeAddress(address)
    .selectUtxosFrom(utxos);

  const unsigned = await tx.complete();
  const signed = await wallet.signTx(unsigned);
  const txHash = await wallet.submitTx(signed);

  console.log("  TX submitted:", txHash);
  console.log("  https://preprod.cardanoscan.io/transaction/" + txHash);
  console.log("  Deadline:", new Date(deadlinePosix).toISOString());
  console.log();

  return { txHash, scaledA, scaledB, deadlinePosix };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: RESOLVE
// ═══════════════════════════════════════════════════════════════════════════

async function resolveStep(provider, wallet, address, utxos, activeTxHash, activeTxIndex, duelId, playerA_pkh, playerB_pkh, startA, startB, deadline) {
  console.log("═══ STEP 3: Resolve ═══\n");

  // Pyth setup
  console.log("  Resolving Pyth state...");
  const pythState = await resolvePythState();
  const pythRewardAddr = scriptHashToRewardAddress(pythState.withdrawScriptHash, 0);

  // Fetch final prices
  console.log("  Fetching final prices...");
  const { signedUpdate, parsedPrices } = await fetchSignedPrices([FEED_A, FEED_B]);

  const finalA = parsedPrices.find((p) => p.feedId === FEED_A);
  const finalB = parsedPrices.find((p) => p.feedId === FEED_B);
  const endA = Math.trunc(finalA.price * Math.pow(10, finalA.exponent));
  const endB = Math.trunc(finalB.price * Math.pow(10, finalB.exponent));

  console.log(`  ADA/USD: start=${startA} → end=${endA}`);
  console.log(`  BTC/USD: start=${startB} → end=${endB}`);

  // Determine winner (same formula as validator)
  const changeA = Math.trunc(((endA - startA) * 1_000_000) / startA);
  const changeB = Math.trunc(((endB - startB) * 1_000_000) / startB);
  const isDraw = Math.abs(changeA - changeB) < 10_000;

  let winnerPkh = null;
  if (!isDraw) {
    winnerPkh = changeA > changeB ? playerA_pkh : playerB_pkh;
  }

  console.log(`  Change A: ${changeA} (${(changeA / 10_000).toFixed(2)}%)`);
  console.log(`  Change B: ${changeB} (${(changeB / 10_000).toFixed(2)}%)`);
  console.log(`  Result: ${isDraw ? "DRAW" : "WINNER = " + (changeA > changeB ? "Player A" : "Player B")}`);

  const totalPot = BET_LOVELACE * 2;
  const resolveRedeemer = mConStr1([deadline]);
  const nowSlot = resolveSlotNo("preprod", Date.now());

  const tx = new MeshTxBuilder({ fetcher: provider, submitter: provider });

  tx
    .invalidBefore(Number(nowSlot) - 60)
    .invalidHereafter(Number(nowSlot) + 60)

    .txInCollateral(utxos[0].input.txHash, utxos[0].input.outputIndex)

    // Pyth zero-withdrawal (state UTxO is both the reference input and the script source)
    .withdrawalPlutusScriptV3()
    .withdrawal(pythRewardAddr, "0")
    .withdrawalTxInReference(pythState.txHash, pythState.txIndex, pythState.scriptSize, pythState.withdrawScriptHash)
    .withdrawalRedeemerValue(mConStr0([signedUpdate.toString("hex")]))

    // Consume active duel UTxO
    .spendingPlutusScriptV3()
    .txIn(activeTxHash, activeTxIndex)
    .txInInlineDatumPresent()
    .txInRedeemerValue(resolveRedeemer)
    .txInScript(spendScriptDouble);

  if (isDraw) {
    const addrA = pkhToAddress(playerA_pkh);
    const addrB = pkhToAddress(playerB_pkh);
    tx
      .txOut(addrA, [{ unit: "lovelace", quantity: String(BET_LOVELACE) }])
      .txOut(addrB, [{ unit: "lovelace", quantity: String(BET_LOVELACE) }]);
  } else {
    const winnerAddr = pkhToAddress(winnerPkh);

    // Mint victory token
    tx
      .mintPlutusScriptV3()
      .mint("1", mintPolicyId, VICTORY_TOKEN_NAME)
      .mintingScript(mintScriptDouble)
      .mintRedeemerValue(mConStr0([]));

    tx.txOut(winnerAddr, [
      { unit: "lovelace", quantity: String(totalPot) },
      { unit: mintPolicyId + VICTORY_TOKEN_NAME, quantity: "1" },
    ]);
  }

  tx
    .changeAddress(address)
    .selectUtxosFrom(utxos);

  const unsigned = await tx.complete();
  const signed = await wallet.signTx(unsigned);
  const txHash = await wallet.submitTx(signed);

  console.log("  TX submitted:", txHash);
  console.log("  https://preprod.cardanoscan.io/transaction/" + txHash);
  console.log();

  return { txHash, isDraw, winnerPkh };
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
  const playerB_pkh = "bb".repeat(28);

  // ── Step 1: DepositA ──
  const { txHash: depositATxHash, duelId } = await depositA(
    provider, wallet, address, utxos, playerA_pkh,
  );

  console.log("  Waiting for DepositA confirmation...");
  await waitForTx(provider, depositATxHash);
  console.log("  DepositA confirmed!\n");

  // Refresh UTxOs after DepositA
  const utxos2 = await wallet.getUtxos();

  // The script UTxO is at output index 0 of the DepositA TX
  // (txOut is the first output we added to the builder)
  const depositATxIndex = 0;

  // ── Step 2: DepositB ──
  const { txHash: depositBTxHash, scaledA, scaledB, deadlinePosix } = await depositB(
    provider, wallet, address, utxos2, playerB_pkh,
    depositATxHash, depositATxIndex, duelId, playerA_pkh,
  );

  console.log("  Waiting for DepositB confirmation...");
  await waitForTx(provider, depositBTxHash);
  console.log("  DepositB confirmed!\n");

  // ── Wait for the duel to finish ──
  const waitMs = Math.max(0, deadlinePosix - Date.now()) + 5_000; // + 5s buffer
  console.log(`  Duel in progress! Waiting ${Math.ceil(waitMs / 1000)}s for deadline...\n`);
  await sleep(waitMs);

  // Refresh UTxOs
  const utxos3 = await wallet.getUtxos();
  const activeTxIndex = 0;

  // ── Step 3: Resolve ──
  const { txHash: resolveTxHash, isDraw, winnerPkh } = await resolveStep(
    provider, wallet, address, utxos3,
    depositBTxHash, activeTxIndex, duelId,
    playerA_pkh, playerB_pkh, scaledA, scaledB, deadlinePosix,
  );

  console.log("  Waiting for Resolve confirmation...");
  await waitForTx(provider, resolveTxHash);
  console.log("  Resolve confirmed!\n");

  // ── Summary ──
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║                  DUEL COMPLETE                   ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Duel ID:   ${duelId.substring(0, 40)}...`);
  console.log(`║  DepositA:  ${depositATxHash.substring(0, 40)}...`);
  console.log(`║  DepositB:  ${depositBTxHash.substring(0, 40)}...`);
  console.log(`║  Resolve:   ${resolveTxHash.substring(0, 40)}...`);
  console.log(`║  Result:    ${isDraw ? "DRAW" : "WINNER"}`);
  if (!isDraw) {
    console.log(`║  Winner:    ${winnerPkh === playerA_pkh ? "Player A" : "Player B"}`);
  }
  console.log("╚══════════════════════════════════════════════════╝");
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
