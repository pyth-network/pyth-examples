/**
 * Lazer RWA — Mint an RWA-backed token on Cardano
 *
 * Fetches the latest RWA price from Pyth Lazer, applies the config
 * parameters to the minting policy, and submits a transaction that:
 *   1. Verifies the Pyth price on-chain (zero-withdrawal)
 *   2. Mints an RWA token if price >= threshold
 *
 * The minting policy enforces the price check — if the oracle price
 * is below the threshold, the transaction fails on-chain.
 *
 * Usage:
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" npm run mint
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="..." FEED=XAUT/USD MIN_PRICE=0 npm run mint
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  createClient,
  ScriptHash,
  TransactionHash,
  Data,
  UPLC,
} from "@evolution-sdk/evolution";
import * as PlutusV3 from "@evolution-sdk/evolution/PlutusV3";
import * as ScriptHashMod from "@evolution-sdk/evolution/ScriptHash";
import * as PolicyIdMod from "@evolution-sdk/evolution/PolicyId";
import * as AssetNameMod from "@evolution-sdk/evolution/AssetName";
import * as Assets from "@evolution-sdk/evolution/Assets";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import {
  getPythScriptHash,
  getPythState,
} from "@pythnetwork/pyth-lazer-cardano-js";
import { parseFeeds, feedName } from "./feeds.js";

// Pyth deployment on Cardano PreProd
const POLICY_ID = "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";

// Defaults
const DEFAULT_FEED = 346;     // XAU/USD
const DEFAULT_MIN_PRICE = 0;  // Allow mint at any price (for demo)
const TOKEN_NAME = "LAZER-RWA";
const MINT_AMOUNT = 1n;

/** Load the compiled minting policy from the Aiken blueprint */
function loadMintingPolicy(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const blueprintPath = join(__dirname, "..", "onchain", "plutus.json");
  const blueprint = JSON.parse(readFileSync(blueprintPath, "utf-8"));
  const validator = blueprint.validators.find(
    (v: { title: string }) =>
      v.title === "lazer_rwa_threshold.lazer_rwa_mint.mint",
  );
  if (!validator) throw new Error("Minting policy not found in blueprint");
  return validator.compiledCode;
}

/**
 * Apply the LazerRwaConfig parameter to the minting policy and return
 * the PlutusV3 script + its policy ID (script hash).
 */
function createMintScript(
  compiledCode: string,
  pythPolicyId: string,
  feedId: number,
  minPrice: number,
) {
  // Build config datum: Constr(0, [pyth_id, feed_id, min_price])
  const configData = Data.constr(0n, [
    Data.bytearray(pythPolicyId),
    Data.int(BigInt(feedId)),
    Data.int(BigInt(minPrice)),
  ]);

  const parameterized = UPLC.applyParamsToScript(compiledCode, [configData]);
  // applySingleCborEncoding ensures correct CBOR wrapping for PlutusV3
  const singleCbor = UPLC.applySingleCborEncoding(parameterized);
  const scriptBytes = new Uint8Array(Buffer.from(singleCbor, "hex"));
  const script = new PlutusV3.PlutusV3({ bytes: scriptBytes });
  const policyId = ScriptHashMod.fromScript(script);

  return { script, policyId };
}

async function main() {
  const lazerToken = process.env.ACCESS_TOKEN;
  if (!lazerToken) throw new Error("Set ACCESS_TOKEN env var");
  const mnemonic = process.env.CARDANO_MNEMONIC;
  if (!mnemonic) throw new Error("Set CARDANO_MNEMONIC env var");

  const feedId = process.env.FEED
    ? parseFeeds(process.env.FEED)[0]
    : DEFAULT_FEED;
  const minPrice = process.env.MIN_PRICE
    ? parseInt(process.env.MIN_PRICE, 10)
    : DEFAULT_MIN_PRICE;
  const name = feedName(feedId);

  console.log(`=== Minting ${TOKEN_NAME} backed by ${name} ===`);
  console.log(`  Feed ID: ${feedId}, Min price: ${minPrice}\n`);

  // Step 1: Load and parameterize the minting policy
  console.log("Step 1 — Loading minting policy from blueprint...");
  const compiledCode = loadMintingPolicy();
  const { script: mintScript, policyId: mintPolicyId } = createMintScript(
    compiledCode,
    POLICY_ID,
    feedId,
    minPrice,
  );
  const mintPolicyHex = ScriptHashMod.toHex(mintPolicyId);
  console.log(`  Mint policy ID: ${mintPolicyHex}`);

  // Step 2: Fetch latest price from Pyth Lazer
  console.log(`Step 2 — Fetching latest ${name} price...`);
  const lazer = await PythLazerClient.create({ token: lazerToken });
  const latestPrice = await lazer.getLatestPrice({
    channel: "fixed_rate@200ms",
    formats: ["solana"],
    jsonBinaryEncoding: "hex",
    priceFeedIds: [feedId],
    properties: ["price", "bestBidPrice", "bestAskPrice", "exponent"],
  });

  if (!latestPrice.solana?.data) {
    throw new Error("No update payload from Pyth Lazer");
  }

  const updateRwa = Buffer.from(latestPrice.solana.data, "hex");
  console.log(`  Signed update: ${updateRwa.length} bytes`);
  console.log(`  Feed data: ${JSON.stringify(latestPrice.parsed?.priceFeeds)}`);

  // Step 3: Resolve Pyth State on-chain
  console.log("Step 3 — Resolving Pyth State on-chain...");
  const providerClient = createClient({
    network: "preprod",
    provider: {
      type: "koios",
      baseUrl: "https://preprod.koios.rest/api/v1",
    },
  });

  const pythState = await getPythState(POLICY_ID, providerClient);
  const pythScript = getPythScriptHash(pythState);
  console.log(`  Pyth withdraw script: ${pythScript}`);

  // Step 4: Build minting transaction
  console.log("Step 4 — Building mint transaction...");
  const wallet = providerClient.attachWallet({ mnemonic, type: "seed" });

  const tokenNameHex = Buffer.from(TOKEN_NAME).toString("hex");
  const policyId = PolicyIdMod.fromHex(mintPolicyHex);
  const assetName = AssetNameMod.fromHex(tokenNameHex);
  const mintAssets = Assets.fromAsset(policyId, assetName, MINT_AMOUNT);

  const now = BigInt(Date.now());

  // Mint redeemer: Constr(0, []) = Mint action
  const mintRedeemer = Data.constr(0n, []);

  const tx = wallet
    .newTx()
    .setValidity({
      from: now - 60_000n,
      to: now + 60_000n,
    })
    .readFrom({
      referenceInputs: [pythState],
    })
    .withdraw({
      amount: 0n,
      redeemer: [updateRwa],
      stakeCredential: ScriptHash.fromHex(pythScript),
    })
    .attachScript({ script: mintScript })
    .mintAssets({
      assets: mintAssets,
      redeemer: mintRedeemer,
    });

  // Step 5: Sign and submit
  console.log("Step 5 — Signing and submitting...");
  const builtTx = await tx.build();
  const digest = await builtTx.signAndSubmit();
  const txHash = TransactionHash.toHex(digest);
  console.log(`  Tx hash: ${txHash}`);
  console.log(`  Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);

  console.log("Waiting for confirmation...");
  await wallet.awaitTx(digest);
  console.log(`\nMinted ${MINT_AMOUNT} ${TOKEN_NAME} backed by ${name}!`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  if (err.cause) console.error("Cause:", JSON.stringify(err.cause, null, 2));
  process.exit(1);
});
