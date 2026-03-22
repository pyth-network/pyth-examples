/**
 * Lazer Perps — Close an existing perpetual position
 *
 * Fetches a fresh Pyth price witness and submits a transaction
 * that closes the position and settles PnL.
 *
 * PnL formula:
 *   Long:  PnL = size * (currentPrice - entryPrice) / entryPrice
 *   Short: PnL = size * (entryPrice - currentPrice) / entryPrice
 *
 * Usage:
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" npm run close-position
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="..." FEED=XAUT/USD npm run close-position
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
  const name = feedName(feedId);

  console.log(`=== Close position on ${name} ===\n`);

  // Step 1: Fetch price witness
  console.log("Step 1 — Fetching price witness...");
  const witness = await fetchPriceWitness(feedId, lazerToken);
  console.log(`  Exit price: ${witness.parsed.price}, Exponent: ${witness.parsed.exponent}`);

  // Step 2: Build close transaction
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
  console.log(`\nPosition closed on ${name}. PnL settled.`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
