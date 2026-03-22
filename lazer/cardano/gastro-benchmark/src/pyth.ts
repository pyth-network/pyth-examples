import * as dotenv from "dotenv";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

dotenv.config({ quiet: true });

const HISTORY_LOOKBACK_DAYS = 3;
const HISTORY_STEP_HOURS = 1;

export type GastronomyFeed = {
  id: number;
  displayName: string;
  symbol: string;
  description: string;
  marketFocus: string;
  supplierUnit: string;
  channel: "fixed_rate@50ms" | "fixed_rate@1000ms" | "real_time";
  displayDivisor: number;
};

type LatestPriceFeed = {
  priceFeedId: number;
  price?: string | number;
  exponent?: number;
  confidence?: string | number;
  publisherCount?: number;
  marketSession?: string;
};

type JsonUpdate = {
  parsed?: {
    timestampUs?: string;
    priceFeeds?: LatestPriceFeed[];
  };
};

export type ResolvedBenchmark = GastronomyFeed & {
  benchmarkPrice: number | null;
  confidence: number | null;
  exponent: number | null;
  publisherCount: number;
  marketSession: string;
  timestampUs: string | null;
  source: "latest" | "historical-fallback" | "unavailable";
};

export const GASTRONOMY_FEEDS: GastronomyFeed[] = [
  {
    id: 3018,
    displayName: "Corn May 2026",
    symbol: "Commodities.COK6/USD",
    description: "Corn futures used as a maize benchmark for polenta and corn flour procurement.",
    marketFocus: "Polenta, harina de maiz, tortillas",
    supplierUnit: "USD/bushel",
    channel: "fixed_rate@50ms",
    displayDivisor: 100,
  },
  {
    id: 3019,
    displayName: "Corn Jul 2026",
    symbol: "Commodities.CON6/USD",
    description: "Corn futures used as a forward maize benchmark for menu planning and seasonal purchasing.",
    marketFocus: "Masa precocida, snacks de maiz, reservas",
    supplierUnit: "USD/bushel",
    channel: "fixed_rate@50ms",
    displayDivisor: 100,
  },
];

let clientPromise: Promise<PythLazerClient> | null = null;

function getClient(): Promise<PythLazerClient> {
  const apiKey = process.env.PYTH_API_KEY;
  if (!apiKey) {
    throw new Error("PYTH_API_KEY not set in .env");
  }

  clientPromise ??= PythLazerClient.create({
    token: apiKey,
    webSocketPoolConfig: {
      numConnections: 1,
    },
  });

  return clientPromise;
}

function scaleFixedPoint(value: string | number | undefined, exponent: number | undefined): number | null {
  if (value === undefined || exponent === undefined) {
    return null;
  }

  return Number(value) * 10 ** exponent;
}

function normalizeDisplayValue(feed: GastronomyFeed, value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return value / feed.displayDivisor;
}

function resolveFromPayload(feed: GastronomyFeed, payloadFeed: LatestPriceFeed | undefined, timestampUs: string | null) {
  const benchmarkPrice = scaleFixedPoint(payloadFeed?.price, payloadFeed?.exponent);
  const confidence = scaleFixedPoint(payloadFeed?.confidence, payloadFeed?.exponent);

  return {
    ...feed,
    benchmarkPrice: normalizeDisplayValue(feed, benchmarkPrice),
    confidence: normalizeDisplayValue(feed, confidence),
    exponent: payloadFeed?.exponent ?? null,
    publisherCount: payloadFeed?.publisherCount ?? 0,
    marketSession: payloadFeed?.marketSession ?? "unknown",
    timestampUs,
    source: benchmarkPrice === null ? ("unavailable" as const) : ("latest" as const),
  };
}

async function getLatestSnapshot(feeds: GastronomyFeed[]): Promise<ResolvedBenchmark[]> {
  const client = await getClient();
  const channel = feeds[0]?.channel ?? "fixed_rate@50ms";
  const response = (await client.getLatestPrice({
    priceFeedIds: feeds.map((feed) => feed.id),
    properties: ["price", "exponent", "confidence", "publisherCount", "marketSession"],
    formats: [],
    channel,
    parsed: true,
    jsonBinaryEncoding: "hex",
  })) as JsonUpdate;

  const priceFeeds = new Map(
    (response.parsed?.priceFeeds ?? []).map((feed) => [feed.priceFeedId, feed]),
  );

  return feeds.map((feed) =>
    resolveFromPayload(feed, priceFeeds.get(feed.id), response.parsed?.timestampUs ?? null),
  );
}

async function getHistoricalFallback(feed: GastronomyFeed): Promise<ResolvedBenchmark | null> {
  const client = await getClient();
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  const nowMs = now.getTime();
  const stepMs = HISTORY_STEP_HOURS * 60 * 60 * 1000;
  const maxAgeMs = HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  for (let offsetMs = stepMs; offsetMs <= maxAgeMs; offsetMs += stepMs) {
    const timestampUs = (nowMs - offsetMs) * 1000;
    let response: JsonUpdate;
    try {
      response = (await client.getPrice({
        timestamp: timestampUs,
        priceFeedIds: [feed.id],
        properties: ["price", "exponent", "confidence", "publisherCount", "marketSession"],
        formats: [],
        channel: feed.channel,
        parsed: true,
        jsonBinaryEncoding: "hex",
      })) as JsonUpdate;
    } catch {
      continue;
    }

    const payloadFeed = response.parsed?.priceFeeds?.[0];
    const benchmarkPrice = scaleFixedPoint(payloadFeed?.price, payloadFeed?.exponent);
    if (benchmarkPrice === null) {
      continue;
    }

    return {
      ...feed,
      benchmarkPrice: normalizeDisplayValue(feed, benchmarkPrice),
      confidence: normalizeDisplayValue(
        feed,
        scaleFixedPoint(payloadFeed?.confidence, payloadFeed?.exponent),
      ),
      exponent: payloadFeed?.exponent ?? null,
      publisherCount: payloadFeed?.publisherCount ?? 0,
      marketSession: payloadFeed?.marketSession ?? "unknown",
      timestampUs: response.parsed?.timestampUs ?? String(timestampUs),
      source: "historical-fallback",
    };
  }

  return null;
}

export async function fetchLatestGastronomyBenchmarks(): Promise<ResolvedBenchmark[]> {
  const latest = await getLatestSnapshot(GASTRONOMY_FEEDS);

  const repaired = await Promise.all(
    latest.map(async (feed) => {
      if (feed.benchmarkPrice !== null) {
        return feed;
      }

      const historical = await getHistoricalFallback(feed);
      return historical ?? feed;
    }),
  );

  return repaired;
}

export async function shutdownPythClient(): Promise<void> {
  if (!clientPromise) {
    return;
  }

  const client = await clientPromise;
  client.shutdown();
  clientPromise = null;
}
