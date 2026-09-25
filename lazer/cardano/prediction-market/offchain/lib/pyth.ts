import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import type { PythUpdate, PriceSnapshot } from "./types.ts";

const PYTH_API_KEY = process.env.PYTH_API_KEY!;

export const FEED_NAME_TO_ID: Record<string, number> = {
  "BTC/USD": 1,
  "ETH/USD": 2,
  "ADA/USD": 16,
};

export async function getPythUpdate(feedName: string): Promise<PythUpdate> {
  const feedId = FEED_NAME_TO_ID[feedName] ?? parseInt(feedName);
  const res = await fetch("https://pyth-lazer.dourolabs.app/v1/latest_price", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PYTH_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: "fixed_rate@200ms",
      formats: ["solana"],
      priceFeedIds: [feedId],
      properties: ["price", "exponent"],
      jsonBinaryEncoding: "hex",
      parsed: true,
    }),
  });
  const data = (await res.json()) as any;
  return {
    solanaHex: data.solana?.data as string,
    price: BigInt(data.parsed?.priceFeeds?.[0]?.price ?? "0"),
    exponent: data.parsed?.priceFeeds?.[0]?.exponent ?? -8,
    feedId,
  };
}

export async function createPythStream(
  feedIds: number[],
  onPrice: (feedId: number, snapshot: PriceSnapshot) => void
): Promise<PythLazerClient> {
  const client = await PythLazerClient.create({
    token: PYTH_API_KEY,
    webSocketPoolConfig: {
      numConnections: 1,
    },
  });

  client.subscribe({
    type: "subscribe",
    subscriptionId: 1,
    priceFeedIds: feedIds,
    properties: ["price", "exponent"],
    formats: ["solana"],
    channel: "fixed_rate@200ms",
    parsed: true,
    jsonBinaryEncoding: "hex",
  });

  client.addMessageListener((msg: any) => {
    if (msg.type === "json" && msg.value?.parsed) {
      for (const feed of msg.value.parsed.priceFeeds ?? []) {
        if (feed.price !== undefined && feed.exponent !== undefined) {
          const rawPrice = BigInt(feed.price);
          onPrice(feed.priceFeedId, {
            price: Number(rawPrice) * Math.pow(10, feed.exponent),
            rawPrice,
            exponent: feed.exponent,
            timestamp: Date.now(),
          });
        }
      }
    }
  });

  return client;
}
