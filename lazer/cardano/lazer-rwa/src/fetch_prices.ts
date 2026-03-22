import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

// Pyth Lazer feed IDs for RWA metals
const XAU_USD = 346; // Gold
const XAG_USD = 345; // Silver

const FEED_NAMES: Record<number, string> = {
  [XAU_USD]: "XAU/USD (Gold)",
  [XAG_USD]: "XAG/USD (Silver)",
};

const main = async () => {
  const token = process.env.ACCESS_TOKEN;
  if (!token) {
    console.error("ERROR: set ACCESS_TOKEN env var first");
    process.exit(1);
  }

  console.log("Connecting to Pyth Lazer...");
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
        console.log(`  Timestamp: ${val.parsed?.timestampUs}`);
        for (const feed of val.parsed?.priceFeeds ?? []) {
          const name =
            FEED_NAMES[feed.priceFeedId] ?? `Feed ${feed.priceFeedId}`;
          console.log(`  ${name}: ${JSON.stringify(feed)}`);
        }
        // Log binary payload — this is what Cardano uses as tx redeemer
        if (val.solana?.data) {
          const hex = val.solana.data;
          console.log(
            `  Binary payload (solana/cardano format): ${hex.length / 2} bytes`,
          );
          console.log(`  Hex: ${hex}`);
        }
      }
    }
  });

  client.addAllConnectionsDownListener(() => {
    console.log("All connections are down");
  });

  // Subscribe with solana format (shared by Cardano)
  client.subscribe({
    type: "subscribe",
    subscriptionId: 1,
    priceFeedIds: [XAU_USD, XAG_USD],
    properties: ["price", "exponent", "bestBidPrice", "bestAskPrice"],
    formats: ["solana"],
    deliveryFormat: "json",
    channel: "fixed_rate@200ms",
    jsonBinaryEncoding: "hex",
  });

  console.log(`Subscribed to XAU/USD (${XAU_USD}) and XAG/USD (${XAG_USD})`);
  console.log("Listening for 10 seconds...\n");

  setTimeout(() => {
    console.log(`\n=== Done: ${msgCount} messages received ===`);
    client.shutdown();
  }, 10000);
};

main();
