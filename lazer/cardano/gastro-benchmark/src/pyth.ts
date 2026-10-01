import * as dotenv from "dotenv";
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";
import { GASTRONOMY_BENCHMARKS, findBenchmarkDefinition } from "./benchmark-catalog";
import type {
  BenchmarkDefinition,
  BenchmarkHistoryPoint,
  BenchmarkSnapshot,
} from "./types";

dotenv.config({ quiet: true });

const HISTORY_LOOKBACK_DAYS = 3;
const HISTORY_STEP_HOURS = 1;

type LatestPriceFeed = {
  priceFeedId: number;
  price?: string | number;
  exponent?: number;
  confidence?: number | string;
  publisherCount?: number;
  marketSession?: string;
};

type JsonUpdate = {
  parsed?: {
    timestampUs?: string;
    priceFeeds?: LatestPriceFeed[];
  };
};

export type PriceProvider = {
  getLatestSnapshot(feeds: BenchmarkDefinition[]): Promise<BenchmarkSnapshot[]>;
  getHistoricalFallback(feed: BenchmarkDefinition): Promise<BenchmarkSnapshot | null>;
  getHistory(feed: BenchmarkDefinition, points: number): Promise<BenchmarkHistoryPoint[]>;
  shutdown(): Promise<void>;
};

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

function normalizeDisplayValue(feed: BenchmarkDefinition, value: number | null): number | null {
  if (value === null) {
    return null;
  }

  return value / feed.displayDivisor;
}

function resolveFromPayload(
  feed: BenchmarkDefinition,
  payloadFeed: LatestPriceFeed | undefined,
  timestampUs: string | null,
): BenchmarkSnapshot {
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
    source: benchmarkPrice === null ? "unavailable" : "latest",
  };
}

export class LivePythPriceProvider implements PriceProvider {
  async getLatestSnapshot(feeds: BenchmarkDefinition[]): Promise<BenchmarkSnapshot[]> {
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

  async getHistoricalFallback(feed: BenchmarkDefinition): Promise<BenchmarkSnapshot | null> {
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

  async getHistory(feed: BenchmarkDefinition, points: number): Promise<BenchmarkHistoryPoint[]> {
    const client = await getClient();
    const history: BenchmarkHistoryPoint[] = [];
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    const nowMs = now.getTime();
    const stepMs = HISTORY_STEP_HOURS * 60 * 60 * 1000;

    for (let index = points - 1; index >= 0; index--) {
      const timestampUs = (nowMs - index * stepMs) * 1000;
      try {
        const response = (await client.getPrice({
          timestamp: timestampUs,
          priceFeedIds: [feed.id],
          properties: ["price", "exponent"],
          formats: [],
          channel: feed.channel,
          parsed: true,
          jsonBinaryEncoding: "hex",
        })) as JsonUpdate;
        const payloadFeed = response.parsed?.priceFeeds?.[0];
        const price = normalizeDisplayValue(
          feed,
          scaleFixedPoint(payloadFeed?.price, payloadFeed?.exponent),
        );
        history.push({
          timestampUs: response.parsed?.timestampUs ?? String(timestampUs),
          price,
          source: "historical-fallback",
        });
      } catch {
        history.push({
          timestampUs: String(timestampUs),
          price: null,
          source: "historical-fallback",
        });
      }
    }

    return history;
  }

  async shutdown(): Promise<void> {
    if (!clientPromise) {
      return;
    }

    const client = await clientPromise;
    client.shutdown();
    clientPromise = null;
  }
}

export async function fetchLatestGastronomyBenchmarks(
  provider: PriceProvider = new LivePythPriceProvider(),
): Promise<BenchmarkSnapshot[]> {
  const latest = await provider.getLatestSnapshot(GASTRONOMY_BENCHMARKS);

  const repaired = await Promise.all(
    latest.map(async (feed) => {
      if (feed.benchmarkPrice !== null) {
        return feed;
      }

      const historical = await provider.getHistoricalFallback(feed);
      return historical ?? feed;
    }),
  );

  return repaired;
}

export async function fetchBenchmarkHistory(
  benchmarkId: number,
  points = 24,
  provider: PriceProvider = new LivePythPriceProvider(),
): Promise<{ benchmark: BenchmarkDefinition; history: BenchmarkHistoryPoint[] }> {
  const benchmark = findBenchmarkDefinition(benchmarkId);
  if (!benchmark) {
    throw new Error(`Unsupported benchmark id: ${benchmarkId}`);
  }

  return {
    benchmark,
    history: await provider.getHistory(benchmark, Math.max(1, Math.min(points, 72))),
  };
}

export async function shutdownPythClient(provider?: PriceProvider): Promise<void> {
  await (provider ?? new LivePythPriceProvider()).shutdown();
}
