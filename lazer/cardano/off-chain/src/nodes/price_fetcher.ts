import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import { appendFileSync } from "fs";
import { resolve } from "path";
import {
  ADA_USD_FEED_ID,
  MAX_PRICE_AGE_MS,
  PYTH_ACCESS_TOKEN,
  PYTH_LAZER_ENDPOINTS,
} from "../config";
import type { PriceUpdate } from "../types/index";
import { priceCache } from "./price_cache";

const LOG_FILE = resolve(process.cwd(), "prices.log");

function logToFile(entry: object): void {
  appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
}

let client: PythLazerClient | null = null;

export async function startPriceFetcher(): Promise<void> {
  client = await PythLazerClient.create(
    [...PYTH_LAZER_ENDPOINTS],
    PYTH_ACCESS_TOKEN,
  );

  await client.subscribe({
    type: "subscribe",
    subscriptionId: 1,
    priceFeedIds: [ADA_USD_FEED_ID],
    properties: ["price", "exponent"],
    formats: ["solana"],
    channel: "fixed_rate@200ms",
  });

  client.addMessageListener((message) => {
    // Messages arrive as JSON: { type: "json", value: { type: "streamUpdated", parsed, solana } }
    if (message.type !== "json") return;

    const val = (message as any).value;
    if (val.type !== "streamUpdated") return;

    const feed = val.parsed?.priceFeeds?.[0];
    const solana: { encoding: "base64" | "hex"; data: string } | undefined = val.solana;
    if (!feed || !solana) return;

    const mantissa = BigInt(feed.price);
    const exponent: number = feed.exponent; // e.g. -8
    // Convert to USD cents: mantissa × 10^(exponent+2)
    const shift = exponent + 2;
    const priceUsdCents =
      shift >= 0
        ? mantissa * 10n ** BigInt(shift)
        : mantissa / 10n ** BigInt(-shift);

    const timestampUs = BigInt(val.parsed.timestampUs ?? 0);
    const timestamp = Number(timestampUs / 1000n); // μs → ms

    const payload = Buffer.from(solana.data, solana.encoding);

    const update: PriceUpdate = {
      feedId: feed.priceFeedId,
      priceUsdCents,
      timestamp,
      payload: new Uint8Array(payload),
    };

    priceCache.set(update);

    const displayUsd = (Number(mantissa) / 1e8).toFixed(4);
    const isoTime = new Date(timestamp).toISOString();

    logToFile({
      ts: isoTime,
      feedId: feed.priceFeedId,
      priceUsd: displayUsd,
      priceUsdCents: priceUsdCents.toString(),
      payloadHex: payload.toString("hex"),
    });

    console.log(`[price_fetcher] ADA/USD = $${displayUsd}  payload=${payload.length}b`);
  });

  console.log(`[price_fetcher] Subscribed to feed ${ADA_USD_FEED_ID} (ADA/USD)`);
}

export function stopPriceFetcher(): void {
  client?.shutdown();
  client = null;
}

/** Returns the latest price if fresh enough, otherwise throws. */
export function getFreshPrice(): PriceUpdate {
  const cached = priceCache.get();
  if (!cached) throw new Error("No price available yet");
  const age = Date.now() - cached.receivedAt;
  if (age > MAX_PRICE_AGE_MS) {
    throw new Error(`Price too stale: ${age}ms old (max ${MAX_PRICE_AGE_MS}ms)`);
  }
  return cached.update;
}
