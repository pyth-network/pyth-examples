/**
 * Lazer Perps — Open a leveraged perpetual position
 *
 * Fetches a fresh Pyth price witness via the orchestrator and submits
 * a transaction that creates a new position on-chain.
 *
 * Usage:
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" npm run open-position
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="..." FEED=XAUT/USD DIRECTION=long LEVERAGE=5 npm run open-position
 */

import { TransactionHash } from "@evolution-sdk/evolution";
import {
  fetchPriceWitness,
  createWalletClient,
  applyPriceWitness,
} from "./orchestrator.js";
import { parseFeeds, feedName } from "./feeds.js";

const DEFAULT_FEED = 172; // XAUT/USD

async function main() {
  const lazerToken = process.env.ACCESS_TOKEN;
  if (!lazerToken) throw new Error("Set ACCESS_TOKEN env var");
  const mnemonic = process.env.CARDANO_MNEMONIC;
  if (!mnemonic) throw new Error("Set CARDANO_MNEMONIC env var");

  const feedId = process.env.FEED
    ? parseFeeds(process.env.FEED)[0]
    : DEFAULT_FEED;
  const direction = (process.env.DIRECTION || "long").toUpperCase();
  const leverage = parseInt(process.env.LEVERAGE || "2", 10);
  const name = feedName(feedId);

  console.log(`=== Open ${direction} ${leverage}x on ${name} ===\n`);

  // Step 1: Fetch price witness from Pyth Lazer
  console.log("Step 1 — Fetching price witness...");
  const witness = await fetchPriceWitness(feedId, lazerToken);
  console.log(`  Price: ${witness.parsed.price}, Exponent: ${witness.parsed.exponent}`);
  console.log(`  Payload: ${witness.updateBytes.length} bytes`);

  // Step 2: Build transaction with price witness
  console.log("Step 2 — Building transaction...");
  const wallet = createWalletClient(mnemonic);
  const now = BigInt(Date.now());

  let tx = wallet
    .newTx()
    .setValidity({ from: now - 60_000n, to: now + 60_000n });

  tx = applyPriceWitness(tx, witness);

  // Step 3: Sign and submit
  console.log("Step 3 — Signing and submitting...");
  const builtTx = await tx.build();
  const digest = await builtTx.signAndSubmit();
  const txHash = TransactionHash.toHex(digest);
  console.log(`  Tx: ${txHash}`);
  console.log(`  Explorer: https://preprod.cardanoscan.io/transaction/${txHash}`);

  console.log("Waiting for confirmation...");
  await wallet.awaitTx(digest);
  console.log(`\nPosition opened: ${direction} ${leverage}x ${name}`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
