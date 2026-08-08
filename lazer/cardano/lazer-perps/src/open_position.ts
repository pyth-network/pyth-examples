/**
 * Lazer Perps — Open a leveraged perpetual position
 *
 * Usage:
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" npm run open-position
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="..." FEED=XAUT/USD DIRECTION=long LEVERAGE=5 npm run open-position
 */

import { TransactionHash } from "@evolution-sdk/evolution";
import {
  fetchPriceWitness,
  createWalletClient,
  buildOpenPositionTx,
} from "./orchestrator.js";
import { parseFeed, feedName, getMarket } from "./feeds.js";
import { formatCollateral } from "./collateral.js";

async function main() {
  const lazerToken = process.env.ACCESS_TOKEN;
  if (!lazerToken) throw new Error("Set ACCESS_TOKEN env var");
  const mnemonic = process.env.CARDANO_MNEMONIC;
  if (!mnemonic) throw new Error("Set CARDANO_MNEMONIC env var");

  const feedId = process.env.FEED ? parseFeed(process.env.FEED) : 172;
  const direction = (process.env.DIRECTION || "long").toUpperCase() as "LONG" | "SHORT";
  const leverage = parseInt(process.env.LEVERAGE || "2", 10);
  const collateral = parseInt(process.env.COLLATERAL || "100000000", 10); // 100 USDCx default
  const market = getMarket(feedId);
  const name = feedName(feedId);

  console.log(`=== Open ${direction} ${leverage}x on ${name} ===`);
  console.log(`  Collateral: ${formatCollateral(collateral)}`);
  if (market) console.log(`  Leverage cap: ${market.leverageCap}x`);
  console.log();

  // 1. Fetch fresh Pyth price witness
  console.log("1. Fetching price witness from Pyth Lazer...");
  const witness = await fetchPriceWitness(feedId, lazerToken);
  console.log(`   Price: ${witness.parsed.price} (exp: ${witness.parsed.exponent})`);
  console.log(`   Payload: ${witness.updateBytes.length} bytes\n`);

  // 2. Build tx via orchestrator
  console.log("2. Building open position tx...");
  const wallet = createWalletClient(mnemonic);
  const tx = buildOpenPositionTx(wallet, witness, {
    feedId,
    direction,
    leverage,
    collateral,
  });

  // 3. Sign and submit
  console.log("3. Signing and submitting...");
  const builtTx = await tx.build();
  const digest = await builtTx.signAndSubmit();
  const txHash = TransactionHash.toHex(digest);
  console.log(`   Tx: ${txHash}`);
  console.log(`   https://preprod.cardanoscan.io/transaction/${txHash}\n`);

  console.log("Waiting for confirmation...");
  await wallet.awaitTx(digest);
  console.log(`Position opened: ${direction} ${leverage}x ${name} (${formatCollateral(collateral)})`);
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
