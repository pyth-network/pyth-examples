/**
 * Lazer Perps — Liquidate an undercollateralized position
 *
 * Anyone can trigger. Liquidation formula:
 *   Long liq_price  = entry × (1 - 1/leverage + 0.01)
 *   Short liq_price = entry × (1 + 1/leverage - 0.01)
 *   Trigger: Long if price ≤ liq_price, Short if price ≥ liq_price
 *
 * Keeper receives 1% of collateral as fee.
 *
 * Usage:
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" npm run liquidate
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="..." FEED=XAUT/USD npm run liquidate
 */

import { TransactionHash } from "@evolution-sdk/evolution";
import {
  fetchPriceWitness,
  createWalletClient,
  buildLiquidateTx,
} from "./orchestrator.js";
import { parseFeed, feedName } from "./feeds.js";

async function main() {
  const lazerToken = process.env.ACCESS_TOKEN;
  if (!lazerToken) throw new Error("Set ACCESS_TOKEN env var");
  const mnemonic = process.env.CARDANO_MNEMONIC;
  if (!mnemonic) throw new Error("Set CARDANO_MNEMONIC env var");

  const feedId = process.env.FEED ? parseFeed(process.env.FEED) : 172;
  const name = feedName(feedId);

  console.log(`=== Liquidation on ${name} ===\n`);

  // 1. Fetch current price from Pyth Lazer
  console.log("1. Fetching price witness...");
  const witness = await fetchPriceWitness(feedId, lazerToken);
  console.log(`   Current price: ${witness.parsed.price} (exp: ${witness.parsed.exponent})\n`);

  // 2. Build liquidation tx via orchestrator
  console.log("2. Building liquidation tx...");
  const wallet = createWalletClient(mnemonic);
  const tx = buildLiquidateTx(wallet, witness, feedId);

  // 3. Sign and submit
  console.log("3. Signing and submitting...");
  const builtTx = await tx.build();
  const digest = await builtTx.signAndSubmit();
  const txHash = TransactionHash.toHex(digest);
  console.log(`   Tx: ${txHash}`);
  console.log(`   https://preprod.cardanoscan.io/transaction/${txHash}\n`);

  console.log("Waiting for confirmation...");
  await wallet.awaitTx(digest);
  console.log(`Liquidation executed on ${name}. Keeper fee: 1%.`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
