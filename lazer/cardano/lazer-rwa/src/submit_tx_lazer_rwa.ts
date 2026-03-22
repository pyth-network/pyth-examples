/**
 * Lazer RWA — Submit transaction with Pyth price verification on Cardano
 *
 * Fetches the latest RWA price from Pyth Lazer, resolves the on-chain
 * Pyth State, and submits a Cardano transaction that triggers the
 * zero-withdrawal pattern to verify the price on-chain.
 *
 * The zero-withdrawal executes the Pyth withdraw script, which verifies
 * the Ed25519 signature and makes the price data available for the
 * lazer_rwa_threshold validator via pyth.get_updates().
 *
 * Usage:
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" npx tsx src/submit_tx_lazer_rwa.ts
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="..." FEED=XAU/USD npx tsx src/submit_tx_lazer_rwa.ts
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="..." FEED=1780 npx tsx src/submit_tx_lazer_rwa.ts
 */

import { createClient, ScriptHash, TransactionHash } from "@evolution-sdk/evolution";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import {
  getPythScriptHash,
  getPythState,
} from "@pythnetwork/pyth-lazer-cardano-js";
import { parseFeeds, feedName } from "./feeds.js";

// Pyth deployment on Cardano PreProd
const POLICY_ID = "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";

// Default feed if FEED env var is not set
const DEFAULT_FEED = 346; // XAU/USD

async function main() {
  const lazerToken = process.env.ACCESS_TOKEN;
  if (!lazerToken) {
    throw new Error("Set ACCESS_TOKEN env var (Pyth Lazer API key)");
  }
  const mnemonic = process.env.CARDANO_MNEMONIC;
  if (!mnemonic) {
    throw new Error("Set CARDANO_MNEMONIC env var (24-word seed phrase)");
  }

  // Parse feed from env or use default
  const feedId = process.env.FEED
    ? parseFeeds(process.env.FEED)[0]
    : DEFAULT_FEED;

  const name = feedName(feedId);

  // Step 1: Fetch latest RWA price from Pyth Lazer
  console.log(`Step 1 — Fetching latest ${name} price from Pyth Lazer...`);
  const lazer = await PythLazerClient.create({ token: lazerToken });
  const latestPrice = await lazer.getLatestPrice({
    channel: "fixed_rate@200ms",
    formats: ["solana"],
    jsonBinaryEncoding: "hex",
    priceFeedIds: [feedId],
    properties: ["price", "bestBidPrice", "bestAskPrice", "exponent"],
  });

  if (!latestPrice.solana?.data) {
    throw new Error("No update payload received from Pyth Lazer");
  }

  const updateRwa = Buffer.from(latestPrice.solana.data, "hex");
  console.log(`  Signed update: ${updateRwa.length} bytes`);
  console.log(`  Feed data: ${JSON.stringify(latestPrice.parsed?.priceFeeds)}`);

  // Step 2: Resolve Pyth State on Cardano PreProd
  console.log("Step 2 — Resolving Pyth State on-chain...");
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

  // Step 3: Build transaction with zero-withdrawal
  console.log("Step 3 — Building transaction...");
  const wallet = providerClient.attachWallet({
    mnemonic,
    type: "seed",
  });

  const now = BigInt(Date.now());
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
    });

  // Step 4: Sign and submit
  console.log("Step 4 — Signing and submitting...");
  const builtTx = await tx.build();
  const digest = await builtTx.signAndSubmit();
  const txHash = TransactionHash.toHex(digest);
  console.log(`  Tx hash: ${txHash}`);
  console.log(`  Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);

  console.log("Waiting for confirmation...");
  await wallet.awaitTx(digest);
  console.log(`Transaction confirmed on Cardano PreProd! (${name})`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
