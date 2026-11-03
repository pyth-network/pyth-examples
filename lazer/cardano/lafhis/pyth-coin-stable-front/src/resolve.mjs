/**
 * resolve.mjs
 *
 * Step 3 of the Duelo de Traders flow: Backend resolves the duel post-deadline.
 *
 * This transaction:
 *   1. Fetches verified Pyth final prices (ADA/USD and BTC/USD)
 *   2. Performs a zero-ADA withdrawal from the Pyth script to verify prices on-chain
 *   3. Spends the Active UTxO from the bet validator
 *   4. Burns the authenticity NFT
 *   5. Pays the winner the full pot (or refunds both players on draw)
 *
 * Required .env vars:
 *   PYTH_TOKEN         – Pyth Lazer API token
 *   BLOCKFROST_ID      – Blockfrost project ID (preprod)
 *   PYTH_POLICY_ID     – PolicyId of the Pyth on-chain state NFT
 *   BACKEND_PKH        – Payment key hash of the backend wallet
 *   MNEMONIC           – Space-separated wallet mnemonic
 *
 * State is read from duel-state.json (written by depositB).
 */

import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import {
  BlockfrostProvider,
  MeshWallet,
  MeshTxBuilder,
  resolveScriptHash,
  applyParamsToScript,
  mConStr0,
  mConStr1,
  resolveSlotNo,
} from "@meshsdk/core";
import { bech32 } from "bech32";
import dotenv from "dotenv";
import { readFileSync } from "fs";
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

// State persisted by depositB
let duelState;
try {
  duelState = JSON.parse(readFileSync(DUEL_STATE_FILE, "utf8"));
} catch {
  console.error("duel-state.json not found — run depositA and depositB first.");
  process.exit(1);
}

if (!duelState.depositB_txHash) {
  console.error("depositB_txHash not found in duel-state.json — run depositB first.");
  process.exit(1);
}

const ACTIVE_TX_HASH  = duelState.depositB_txHash;
const ACTIVE_TX_INDEX = duelState.depositB_txIndex ?? 0;
const DUEL_ID         = duelState.duelId;
const PLAYER_A_PKH    = duelState.playerA_pkh;
const DEADLINE        = duelState.deadline;
const BET_LOVELACE    = duelState.betLovelace;
// For testing, player B is hardcoded. In prod, read from duel-state.
const PLAYER_B_PKH    = "bb".repeat(28);

const FEED_A = 16;  // ADA/USD
const FEED_B = 29;  // BTC/USD

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
const NFT_COMPILED_CODE    = plutus.validators.find((v) => v.title === "nft.nft_policy.mint").compiledCode;
const BET_COMPILED_CODE    = plutus.validators.find((v) => v.title === "validators.bet.spend").compiledCode;
const WINNER_COMPILED_CODE = plutus.validators.find((v) => v.title === "winner_token.winner_token.mint").compiledCode;

const mintScriptCbor = applyParamsToScript(NFT_COMPILED_CODE, [cborBytesParam(BACKEND_PKH)], "CBOR");
const mintPolicyId   = resolveScriptHash(mintScriptCbor, "V3");

const spendScriptCbor = applyParamsToScript(BET_COMPILED_CODE, [
  cborBytesParam(BACKEND_PKH),
  cborBytesParam(mintPolicyId),
  cborBytesParam(PYTH_POLICY_ID),
], "CBOR");

const winnerScriptCbor = applyParamsToScript(WINNER_COMPILED_CODE, [cborBytesParam(BACKEND_PKH)], "CBOR");
const winnerPolicyId   = resolveScriptHash(winnerScriptCbor, "V3");
const WINNER_TOKEN_NAME = "686f727365736f6f65"; // "horseshoe" UTF-8

console.log("Mint policy ID:   ", mintPolicyId);
console.log("Winner policy ID: ", winnerPolicyId);
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const PYTH_STATE_ASSET_NAME = Buffer.from("Pyth State", "utf-8").toString("hex");

function scriptHashToRewardAddress(hash, networkId = 0) {
  const header = networkId === 0 ? 0xf0 : 0xf1;
  const bytes = Buffer.concat([Buffer.from([header]), Buffer.from(hash, "hex")]);
  return bech32.encode(networkId === 0 ? "stake_test" : "stake", bech32.toWords(bytes), 200);
}

function pkhToAddress(pkh) {
  const bytes = Buffer.concat([Buffer.from([0x60]), Buffer.from(pkh, "hex")]);
  return bech32.encode("addr_test", bech32.toWords(bytes), 200);
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
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("═══ Resolve ═══\n");

  // Check deadline
  const now = Date.now();
  if (now < DEADLINE) {
    const remaining = Math.ceil((DEADLINE - now) / 1000);
    console.log(`  Deadline not reached yet. ${remaining}s remaining.`);
    console.log(`  Deadline: ${new Date(DEADLINE).toISOString()}`);
    process.exit(0);
  }

  // 1. Resolve Pyth state
  console.log("  Resolving Pyth state...");
  const pythState = await resolvePythState();
  const pythRewardAddr = scriptHashToRewardAddress(pythState.withdrawScriptHash, 0);
  console.log(`  Pyth state: ${pythState.txHash}#${pythState.txIndex}`);

  // 2. Fetch final prices
  console.log("  Fetching final prices...");
  const { signedUpdate, parsedPrices } = await fetchSignedPrices([FEED_A, FEED_B]);

  const finalA = parsedPrices.find((p) => p.feedId === FEED_A);
  const finalB = parsedPrices.find((p) => p.feedId === FEED_B);
  const endA = finalA.price;
  const endB = finalB.price;

  // Read start prices from duel-state (set during depositB)
  const startA = duelState.startPriceA;
  const startB = duelState.startPriceB;

  console.log(`  ADA/USD: start=${startA} → end=${endA}`);
  console.log(`  BTC/USD: start=${startB} → end=${endB}`);

  // Determine winner (same formula as validator)
  const changeA = Math.trunc(((endA - startA) * 1_000_000) / startA);
  const changeB = Math.trunc(((endB - startB) * 1_000_000) / startB);
  const isDraw = Math.abs(changeA - changeB) < 100;

  console.log(`  Change A: ${changeA} (${(changeA / 10_000).toFixed(2)}%)`);
  console.log(`  Change B: ${changeB} (${(changeB / 10_000).toFixed(2)}%)`);
  console.log(`  Result: ${isDraw ? "DRAW" : "WINNER = " + (changeA > changeB ? "Player A" : "Player B")}`);
  console.log();

  // 3. Setup wallet
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

  console.log(`  Winner policy ID: ${winnerPolicyId}\n`);

  // 4. Build transaction
  const totalPot = BET_LOVELACE * 2;

  // Encode Resolve { timestamp } as CBOR hex manually.
  // mConStr1([largeInt]) has a known MeshJS serialisation issue with big integers.
  // Constr 1 [I n]  =>  d87a 81 <cbor-uint>
  function cborConstr1Int(n) {
    const buf = [0xd8, 0x7a, 0x81]; // tag(122) array(1)
    const big = BigInt(n);
    if (big <= 0x17n)       { buf.push(Number(big)); }
    else if (big <= 0xffn)  { buf.push(0x18, Number(big)); }
    else if (big <= 0xffffn){ buf.push(0x19, Number(big >> 8n), Number(big & 0xffn)); }
    else if (big <= 0xffffffffn) {
      buf.push(0x1a,
        Number((big >> 24n) & 0xffn), Number((big >> 16n) & 0xffn),
        Number((big >> 8n)  & 0xffn), Number(big & 0xffn));
    } else {
      buf.push(0x1b,
        Number((big >> 56n) & 0xffn), Number((big >> 48n) & 0xffn),
        Number((big >> 40n) & 0xffn), Number((big >> 32n) & 0xffn),
        Number((big >> 24n) & 0xffn), Number((big >> 16n) & 0xffn),
        Number((big >> 8n)  & 0xffn), Number(big & 0xffn));
    }
    return Buffer.from(buf).toString("hex");
  }

  const resolveRedeemerCbor = cborConstr1Int(DEADLINE);
  const burnRedeemer = mConStr1([]);  // Burn redeemer for nft_policy — empty, no issue
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
    .withdrawalRedeemerValue([signedUpdate.toString("hex")], "Mesh", { mem: 10_000_000, steps: 6_000_000_000 })

    // Spend Active UTxO
    .spendingPlutusScriptV3()
    .txIn(ACTIVE_TX_HASH, ACTIVE_TX_INDEX)
    .txInInlineDatumPresent()
    .txInRedeemerValue(resolveRedeemerCbor, "CBOR", { mem: 5_000_000, steps: 2_000_000_000 })
    .txInScript(spendScriptCbor)

    // Burn the authenticity NFT
    .mintPlutusScriptV3()
    .mint("-1", mintPolicyId, DUEL_ID)
    .mintingScript(mintScriptCbor)
    .mintRedeemerValue(burnRedeemer, "Mesh", { mem: 1_000_000, steps: 1_000_000_000 });

  if (isDraw) {
    tx
      .txOut(pkhToAddress(PLAYER_A_PKH), [{ unit: "lovelace", quantity: String(BET_LOVELACE) }])
      .txOut(pkhToAddress(PLAYER_B_PKH), [{ unit: "lovelace", quantity: String(BET_LOVELACE) }]);
  } else {
    const winnerPkh = changeA > changeB ? PLAYER_A_PKH : PLAYER_B_PKH;

    // Mint 1 winner trophy token (winner_token Plutus validator)
    tx
      .mintPlutusScriptV3()
      .mint("1", winnerPolicyId, WINNER_TOKEN_NAME)
      .mintingScript(winnerScriptCbor)
      .mintRedeemerValue(mConStr0([]), "Mesh", { mem: 500_000, steps: 500_000_000 });

    tx.txOut(pkhToAddress(winnerPkh), [
      { unit: "lovelace", quantity: String(totalPot) },
      { unit: winnerPolicyId + WINNER_TOKEN_NAME, quantity: "1" },
    ]);
  }

  tx
    .changeAddress(address)
    .selectUtxosFrom(utxos);

  console.log("  Building transaction...");
  const unsigned = await tx.complete();
  const signed = await wallet.signTx(unsigned);
  const txHash = await wallet.submitTx(signed);

  console.log("\n  TX submitted:", txHash);
  console.log("  https://preprod.cardanoscan.io/transaction/" + txHash);
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
