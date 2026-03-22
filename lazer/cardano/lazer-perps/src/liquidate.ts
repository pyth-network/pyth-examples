/**
 * Lazer Perps — Liquidate an undercollateralized position
 *
 * Fetches a fresh Pyth price witness and submits a liquidation tx.
 * Anyone can call this — no owner signature needed.
 *
 * Liquidation formula:
 *   margin_ratio = (collateral + PnL) / collateral
 *   If margin_ratio < liquidation_threshold (80%) → liquidatable
 *
 * Usage:
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" npm run liquidate
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="..." FEED=XAUT/USD npm run liquidate
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

  console.log(`=== Liquidation check on ${name} ===\n`);

  // Step 1: Fetch price witness
  console.log("Step 1 — Fetching price witness...");
  const witness = await fetchPriceWitness(feedId, lazerToken);
  console.log(`  Current price: ${witness.parsed.price}, Exponent: ${witness.parsed.exponent}`);

  // Step 2: Build liquidation transaction
  console.log("Step 2 — Building liquidation transaction...");
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
  console.log(`\nLiquidation executed on ${name}.`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
