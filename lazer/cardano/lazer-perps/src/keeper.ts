/**
 * Lazer Perps — Keeper bot
 *
 * Streams prices via Pyth Lazer WebSocket and monitors for liquidation
 * opportunities. Computes liquidation prices for each market and logs
 * when positions would be liquidatable.
 *
 * Liquidation price formulas:
 *   Long:  entry × (1 - 1/leverage + 0.01)
 *   Short: entry × (1 + 1/leverage - 0.01)
 *
 * Usage:
 *   ACCESS_TOKEN=<token> npm run keeper
 *   ACCESS_TOKEN=<token> FEEDS=XAU/USD,XAUT/USD npm run keeper
 */

import { streamPythPrice } from "./orchestrator.js";
import { parseFeeds, feedName, getMarket, MARKETS } from "./feeds.js";

const DEFAULT_FEEDS = MARKETS.filter((m) => m.status === "stable").map((m) => m.id);

// Example positions to monitor (in production: read from chain)
const MOCK_POSITIONS = [
  { feedId: 172, direction: "LONG" as const, leverage: 5, entryPrice: 4480_000000, collateral: 100_000000 },
  { feedId: 346, direction: "SHORT" as const, leverage: 10, entryPrice: 3300_000, collateral: 500_000000 },
];

function computeLiqPrice(direction: "LONG" | "SHORT", entryPrice: number, leverage: number): number {
  if (direction === "LONG") {
    // entry × (1 - 1/leverage + 0.01)
    return Math.round(entryPrice * (1 - 1 / leverage + 0.01));
  } else {
    // entry × (1 + 1/leverage - 0.01)
    return Math.round(entryPrice * (1 + 1 / leverage - 0.01));
  }
}

function isLiquidatable(direction: "LONG" | "SHORT", currentPrice: number, liqPrice: number): boolean {
  if (direction === "LONG") return currentPrice <= liqPrice;
  return currentPrice >= liqPrice;
}

const main = async () => {
  const token = process.env.ACCESS_TOKEN;
  if (!token) {
    console.error("Set ACCESS_TOKEN env var");
    process.exit(1);
  }

  const feedIds = process.env.FEEDS ? parseFeeds(process.env.FEEDS) : DEFAULT_FEEDS;

  console.log("=== Lazer Perps Keeper ===\n");
  console.log("Monitoring markets:", feedIds.map(feedName).join(", "));
  console.log("\nMock positions:");
  for (const pos of MOCK_POSITIONS) {
    const liqPrice = computeLiqPrice(pos.direction, pos.entryPrice, pos.leverage);
    console.log(
      `  ${feedName(pos.feedId)} ${pos.direction} ${pos.leverage}x — entry: ${pos.entryPrice}, liq_price: ${liqPrice}`,
    );
  }
  console.log();

  let updateCount = 0;

  const client = await streamPythPrice(feedIds, token, (feedId, priceStr, exponent) => {
    updateCount++;
    const price = Number(priceStr);

    // Check each mock position for this feed
    for (const pos of MOCK_POSITIONS) {
      if (pos.feedId !== feedId) continue;

      const liqPrice = computeLiqPrice(pos.direction, pos.entryPrice, pos.leverage);
      const liquidatable = isLiquidatable(pos.direction, price, liqPrice);

      // Log every 5 seconds (25 updates at 200ms)
      if (updateCount % 25 === 0) {
        const status = liquidatable ? "LIQUIDATABLE" : "safe";
        console.log(
          `[${new Date().toISOString()}] ${feedName(feedId)}: ${price} (exp: ${exponent}) | ${pos.direction} ${pos.leverage}x → ${status}`,
        );
      }

      if (liquidatable) {
        console.log(
          `\n*** LIQUIDATION TRIGGER: ${feedName(feedId)} ${pos.direction} ${pos.leverage}x ***`,
          `\n    Current: ${price}, Liq price: ${liqPrice}`,
          `\n    → In production: submit liquidation tx via orchestrator\n`,
        );
      }
    }
  });

  console.log("Keeper running. Press Ctrl+C to stop.\n");

  process.on("SIGINT", () => {
    console.log(`\nKeeper stopped after ${updateCount} price updates.`);
    client.shutdown();
    process.exit(0);
  });
};

main();
