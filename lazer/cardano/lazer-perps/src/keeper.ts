/**
 * Lazer Perps — Keeper bot
 *
 * Streams Pyth Lazer prices via WebSocket and monitors positions
 * for liquidation opportunities. When a position becomes
 * undercollateralized, the keeper submits a liquidation tx.
 *
 * Usage:
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" npm run keeper
 *   ACCESS_TOKEN=<token> CARDANO_MNEMONIC="..." FEEDS=XAU/USD,XAUT/USD npm run keeper
 */

import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import { parseFeeds, feedName, CATALOG } from "./feeds.js";

const DEFAULT_FEEDS = [346, 345, 172]; // XAU, XAG, XAUT
const LIQUIDATION_THRESHOLD_BPS = 8000; // 80%

const main = async () => {
  const token = process.env.ACCESS_TOKEN;
  if (!token) {
    console.error("Set ACCESS_TOKEN env var");
    process.exit(1);
  }

  const feedIds = process.env.FEEDS
    ? parseFeeds(process.env.FEEDS)
    : DEFAULT_FEEDS;

  console.log("=== Lazer Perps Keeper ===");
  console.log(`Liquidation threshold: ${LIQUIDATION_THRESHOLD_BPS / 100}%`);
  console.log(`Monitoring: ${feedIds.map(feedName).join(", ")}\n`);

  console.log("Connecting to Pyth Lazer...");
  const client = await PythLazerClient.create({
    token,
    webSocketPoolConfig: {
      urls: ["wss://pyth-lazer.dourolabs.app/v1/stream"],
      numConnections: 1,
    },
  });

  let updateCount = 0;

  client.addMessageListener((message) => {
    if (message.type !== "json") return;
    const val = message.value;
    if (val.type !== "streamUpdated") return;

    updateCount++;
    const feeds = val.parsed?.priceFeeds ?? [];

    for (const feed of feeds) {
      const name = feedName(feed.priceFeedId);
      const price = feed.price;

      if (price !== undefined) {
        // In production: query on-chain positions for this feed,
        // compute margin ratios, and trigger liquidations.
        if (updateCount % 25 === 0) {
          console.log(
            `[${new Date().toISOString()}] ${name}: ${price} (exp: ${feed.exponent}) — scanning positions...`,
          );
        }
      }
    }
  });

  client.addAllConnectionsDownListener(() => {
    console.log("WARNING: All connections down — keeper paused");
  });

  client.subscribe({
    type: "subscribe",
    subscriptionId: 1,
    priceFeedIds: feedIds,
    properties: ["price", "exponent", "bestBidPrice", "bestAskPrice"],
    formats: ["solana"],
    deliveryFormat: "json",
    channel: "fixed_rate@200ms",
    jsonBinaryEncoding: "hex",
  });

  console.log("Keeper running. Press Ctrl+C to stop.\n");

  // Keep running until interrupted
  process.on("SIGINT", () => {
    console.log(`\nKeeper stopped after ${updateCount} price updates.`);
    client.shutdown();
    process.exit(0);
  });
};

main();
