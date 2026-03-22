import "server-only";

import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

const ADA_USD_FEED_ID = 16;
const MAX_PRICE_AGE_MS = 60_000;

const PYTH_ACCESS_TOKEN = process.env.PYTH_ACCESS_TOKEN ?? "";

export function isPythConfigured(): boolean {
  return !!PYTH_ACCESS_TOKEN;
}

interface CachedPrice {
  feedId: number;
  priceUsdCents: bigint;
  timestamp: number; // unix ms
  payload: Uint8Array;
  receivedAt: number; // unix ms
}

let cached: CachedPrice | null = null;
let client: PythLazerClient | null = null;

let clientReady: Promise<void> | null = null;

async function ensureClient(): Promise<void> {
  if (clientReady) return clientReady;
  if (!PYTH_ACCESS_TOKEN) {
    throw new Error("PYTH_ACCESS_TOKEN not set in .env.local");
  }

  clientReady = (async () => {
    client = await PythLazerClient.create({
      token: PYTH_ACCESS_TOKEN,
      webSocketPoolConfig: {},
    });

    const firstPrice = new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 5_000);

      client!.addMessageListener((message) => {
        if (message.type !== "json") return;
        const val = (message as any).value;
        if (val.type !== "streamUpdated") return;

        const feed = val.parsed?.priceFeeds?.[0];
        const solana:
          | { encoding: "base64" | "hex"; data: string }
          | undefined = val.solana;
        if (!feed || !solana) return;

        const mantissa = BigInt(feed.price);
        const exponent: number = feed.exponent;
        const shift = exponent + 2;
        const priceUsdCents =
          shift >= 0
            ? mantissa * 10n ** BigInt(shift)
            : mantissa / 10n ** BigInt(-shift);

        const timestampUs = BigInt(val.parsed.timestampUs ?? 0);
        const timestamp = Number(timestampUs / 1000n);

        const payload = Buffer.from(solana.data, solana.encoding);

        cached = {
          feedId: feed.priceFeedId,
          priceUsdCents,
          timestamp,
          payload: new Uint8Array(payload),
          receivedAt: Date.now(),
        };
        _notifyListeners();

        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      let resolved = false;
    });

    client.subscribe({
      type: "subscribe",
      subscriptionId: 1,
      priceFeedIds: [ADA_USD_FEED_ID],
      properties: ["price", "exponent"],
      formats: ["solana"],
      channel: "fixed_rate@200ms",
    });

    console.log(`[pyth] Subscribed to feed ${ADA_USD_FEED_ID} (ADA/USD)`);
    await firstPrice;
    console.log("[pyth] First price received");
  })();

  return clientReady;
}

export interface FreshPrice {
  feedId: number;
  priceUsdCents: string; // bigint as string for JSON
  timestamp: number;
  payload: Uint8Array;
}

export async function getFreshPrice(): Promise<FreshPrice> {
  await ensureClient();

  if (!cached) throw new Error("No price available yet — waiting for first update");

  const age = Date.now() - cached.receivedAt;
  if (age > MAX_PRICE_AGE_MS) {
    throw new Error(`Price too stale: ${age}ms old (max ${MAX_PRICE_AGE_MS}ms)`);
  }

  return {
    feedId: cached.feedId,
    priceUsdCents: cached.priceUsdCents.toString(),
    timestamp: cached.timestamp,
    payload: cached.payload,
  };
}

export function getLatestPriceIfAvailable(): FreshPrice | null {
  if (!cached) return null;
  return {
    feedId: cached.feedId,
    priceUsdCents: cached.priceUsdCents.toString(),
    timestamp: cached.timestamp,
    payload: cached.payload,
  };
}

type PriceListener = (price: { feedId: number; priceUsdCents: string; timestamp: number }) => void;
const priceListeners = new Set<PriceListener>();

export function onPriceUpdate(listener: PriceListener): () => void {
  priceListeners.add(listener);
  return () => { priceListeners.delete(listener); };
}

export function _notifyListeners(): void {
  if (!cached) return;
  const snap = { feedId: cached.feedId, priceUsdCents: cached.priceUsdCents.toString(), timestamp: cached.timestamp };
  for (const fn of priceListeners) fn(snap);
}

export { ensureClient as initPythClient };
