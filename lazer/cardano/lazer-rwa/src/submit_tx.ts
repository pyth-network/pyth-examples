/**
 * Step 3: Build and submit a Cardano transaction that:
 * 1. Fetches the latest RWA price from Pyth Lazer (XAU/USD)
 * 2. Resolves the on-chain Pyth State
 * 3. Triggers the zero-withdrawal to verify the price on-chain
 *
 * This is the off-chain counterpart to the rwa_threshold Aiken validator.
 *
 * Usage:
 *   ACCESS_TOKEN=... CARDANO_MNEMONIC="..." npx tsx src/submit_tx.ts
 */

import { createClient, ScriptHash, TransactionHash } from "@evolution-sdk/evolution";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import {
  getPythScriptHash,
  getPythState,
} from "@pythnetwork/pyth-lazer-cardano-js";

// --- Config ---
const POLICY_ID = "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";
const XAU_USD = 346;

async function main() {
  const lazerToken = process.env.ACCESS_TOKEN;
  if (!lazerToken) {
    throw new Error("Set ACCESS_TOKEN env var (Pyth Lazer API key)");
  }
  const mnemonic = process.env.CARDANO_MNEMONIC;
  if (!mnemonic) {
    throw new Error("Set CARDANO_MNEMONIC env var (Cardano wallet seed phrase)");
  }

  // --- Step 1: Fetch latest price from Pyth Lazer ---
  console.log("1. Fetching latest XAU/USD price from Pyth Lazer...");
  const lazer = await PythLazerClient.create({ token: lazerToken });
  const latestPrice = await lazer.getLatestPrice({
    channel: "fixed_rate@200ms",
    formats: ["solana"],
    jsonBinaryEncoding: "hex",
    priceFeedIds: [XAU_USD],
    properties: ["price", "bestBidPrice", "bestAskPrice", "exponent"],
  });

  if (!latestPrice.solana?.data) {
    throw new Error("Missing update payload from Pyth Lazer");
  }

  const update = Buffer.from(latestPrice.solana.data, "hex");
  console.log(`   Update bytes: ${update.length} bytes`);
  console.log(`   Parsed: ${JSON.stringify(latestPrice.parsed?.priceFeeds)}`);

  // --- Step 2: Resolve on-chain Pyth State ---
  console.log("2. Resolving Pyth State on Cardano PreProd...");
  const providerClient = createClient({
    network: "preprod",
    provider: {
      type: "koios",
      baseUrl: "https://preprod.koios.rest/api/v1",
    },
  });

  const pythState = await getPythState(POLICY_ID, providerClient);
  const pythScript = getPythScriptHash(pythState);
  console.log(`   Pyth withdraw script hash: ${pythScript}`);

  // --- Step 3: Build and submit transaction ---
  console.log("3. Building transaction...");
  const client = providerClient.attachWallet({
    mnemonic,
    type: "seed",
  });

  const now = BigInt(Date.now());
  const tx = client
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
      redeemer: [update],
      stakeCredential: ScriptHash.fromHex(pythScript),
    });

  // In a full app, you'd also collectFrom a UTxO locked at the
  // rwa_threshold validator address with the MintOrBorrow redeemer.
  // For now, this just verifies the price on-chain via Pyth's script.

  console.log("4. Signing and submitting...");
  const builtTx = await tx.build();
  const digest = await builtTx.signAndSubmit();
  const txHash = TransactionHash.toHex(digest);
  console.log(`   Transaction hash: ${txHash}`);

  console.log("5. Waiting for confirmation...");
  await client.awaitTx(digest);
  console.log("   Transaction confirmed!");
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
