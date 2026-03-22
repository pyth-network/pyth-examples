/**
 * Lazer Perps — Close an existing perpetual position
 *
 * PnL = direction_multiplier × collateral × leverage × (exit - entry) / entry
 * Payout = max(0, collateral + PnL)
 *
 * Usage:
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" npm run close-position
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="..." FEED=XAUT/USD npm run close-position
 */

import { TransactionHash } from "@evolution-sdk/evolution";
import {
  fetchPriceWitness,
  createWalletClient,
  buildClosePositionTx,
} from "./orchestrator.js";
import { parseFeed, feedName } from "./feeds.js";

async function main() {
  const lazerToken = process.env.ACCESS_TOKEN;
  if (!lazerToken) throw new Error("Set ACCESS_TOKEN env var");
  const mnemonic = process.env.CARDANO_MNEMONIC;
  if (!mnemonic) throw new Error("Set CARDANO_MNEMONIC env var");

  const feedId = process.env.FEED ? parseFeed(process.env.FEED) : 172;
  const name = feedName(feedId);

  console.log(`=== Close position on ${name} ===\n`);

  // 1. Fetch exit price from Pyth Lazer
  console.log("1. Fetching exit price witness...");
  const witness = await fetchPriceWitness(feedId, lazerToken);
  console.log(`   Exit price: ${witness.parsed.price} (exp: ${witness.parsed.exponent})\n`);

  // 2. Build close tx via orchestrator
  console.log("2. Building close position tx...");
  const wallet = createWalletClient(mnemonic);
  const tx = buildClosePositionTx(wallet, witness, feedId);

  // 3. Sign and submit
  console.log("3. Signing and submitting...");
  const builtTx = await tx.build();
  const digest = await builtTx.signAndSubmit();
  const txHash = TransactionHash.toHex(digest);
  console.log(`   Tx: ${txHash}`);
  console.log(`   https://preprod.cardanoscan.io/transaction/${txHash}\n`);

  console.log("Waiting for confirmation...");
  await wallet.awaitTx(digest);
  console.log(`Position closed on ${name}. PnL settled.`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
