/**
 * Lazer RWA — Off-chain price feed receiver
 *
 * Connects to Pyth Lazer WebSocket and streams real-time RWA price data.
 * The binary payload received here is the same Ed25519-signed data
 * that gets submitted to Cardano as a zero-withdrawal redeemer
 * for on-chain verification via pyth.get_updates().
 *
 * Usage:
 *   ACCESS_TOKEN=<pyth-lazer-token> npx tsx src/fetch_prices_lazer_rwa.ts
 */

import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

// RWA feed IDs — metals on Pyth Lazer
const XAU_USD = 346; // Gold spot price
const XAG_USD = 345; // Silver spot price

const FEED_NAMES: Record<number, string> = {
  [XAU_USD]: "XAU/USD (Gold)",
  [XAG_USD]: "XAG/USD (Silver)",
};

const RWA_FEEDS = [XAU_USD, XAG_USD];

const main = async () => {
  const token = process.env.ACCESS_TOKEN;
  if (!token) {
    console.error("ERROR: set ACCESS_TOKEN env var");
    console.error("  export ACCESS_TOKEN=<your-pyth-lazer-token>");
    process.exit(1);
  }

  // Connect to Pyth Lazer WebSocket (SDK v5 requires webSocketPoolConfig)
  console.log("Connecting to Pyth Lazer WebSocket...");
  const client = await PythLazerClient.create({
    token,
    webSocketPoolConfig: {
      urls: ["wss://pyth-lazer.dourolabs.app/v1/stream"],
      numConnections: 1,
    },
  });

  let msgCount = 0;

  client.addMessageListener((message) => {
    msgCount++;

    if (message.type === "json") {
      const val = message.value;

      if (val.type === "streamUpdated") {
        console.log(`\n--- Update #${msgCount} ---`);
        console.log(`  Timestamp (us): ${val.parsed?.timestampUs}`);

        // JSON parsed feeds — human-readable price data
        for (const feed of val.parsed?.priceFeeds ?? []) {
          const name =
            FEED_NAMES[feed.priceFeedId] ?? `Feed ${feed.priceFeedId}`;
          const parts = [];
          if (feed.price !== undefined) parts.push(`price=${feed.price}`);
          if (feed.exponent !== undefined)
            parts.push(`exponent=${feed.exponent}`);
          if (feed.bestBidPrice !== undefined)
            parts.push(`bid=${feed.bestBidPrice}`);
          if (feed.bestAskPrice !== undefined)
            parts.push(`ask=${feed.bestAskPrice}`);
          console.log(`  ${name}: ${parts.join(", ") || "(no price — market closed)"}`);
        }

        // Binary payload — Ed25519-signed, little-endian (solana/cardano format)
        // This is the exact bytes sent as redeemer in the Cardano transaction
        if (val.solana?.data) {
          const hex = val.solana.data;
          const bytes = hex.length / 2;
          console.log(`  Binary payload: ${bytes} bytes`);
          console.log(`  Hex: ${hex}`);
        }
      }
    }
  });

  client.addAllConnectionsDownListener(() => {
    console.log("WARNING: All WebSocket connections are down");
  });

  // Subscribe to RWA feeds in solana format (shared by Cardano)
  // Properties match what the on-chain validator expects
  client.subscribe({
    type: "subscribe",
    subscriptionId: 1,
    priceFeedIds: RWA_FEEDS,
    properties: ["price", "exponent", "bestBidPrice", "bestAskPrice"],
    formats: ["solana"],
    deliveryFormat: "json",
    channel: "fixed_rate@200ms",
    jsonBinaryEncoding: "hex",
  });

  const feedList = RWA_FEEDS.map((id) => FEED_NAMES[id]).join(", ");
  console.log(`Subscribed to: ${feedList}`);
  console.log("Streaming for 10 seconds...\n");

  setTimeout(() => {
    console.log(`\n=== ${msgCount} updates received. Shutting down. ===`);
    client.shutdown();
  }, 10000);
};

main();
