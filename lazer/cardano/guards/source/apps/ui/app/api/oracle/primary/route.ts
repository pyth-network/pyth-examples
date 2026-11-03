import { NextResponse } from "next/server";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import {
  PythLazerClient,
  type AssetType,
  type Channel,
  type SymbolResponse,
} from "@pythnetwork/pyth-lazer-sdk";
import type { OracleSnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), "..", "..", ".env"), quiet: true });

let cachedClient: PythLazerClient | null = null;
let cachedClientPromise: Promise<PythLazerClient> | null = null;
let cachedResolvedPriceFeedId: number | null = null;

function toDecimal(value: number, exponent: number): number {
  return value * 10 ** exponent;
}

function readString(name: string, fallback = ""): string {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readOptionalNumber(name: string): number | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSymbol(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function parseRequiredNumber(
  value: number | string | undefined,
  field: string,
): number {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(parsed)) {
    throw new Error(`Pyth update is missing numeric field ${field}`);
  }

  return parsed as number;
}

function normalizeTimestampUs(value: number): number {
  if (value >= 1_000_000_000_000_000) {
    return Math.trunc(value);
  }

  if (value >= 1_000_000_000_000) {
    return Math.trunc(value * 1_000);
  }

  if (value >= 1_000_000_000) {
    return Math.trunc(value * 1_000_000);
  }

  return Math.trunc(value);
}

function selectBestSymbolMatch(
  matches: SymbolResponse[],
  query: string,
): SymbolResponse | undefined {
  const normalized = normalizeSymbol(query);
  const exact = matches.find((candidate) => {
    const fields = [candidate.symbol, candidate.name, candidate.description].map(normalizeSymbol);
    return fields.includes(normalized);
  });

  if (exact) {
    return exact;
  }

  return matches.find((candidate) => normalizeSymbol(candidate.symbol).includes(normalized));
}

function getClient(config: {
  pythApiKey: string;
  metadataServiceUrl: string;
  priceServiceUrl: string;
}): Promise<PythLazerClient> {
  if (cachedClient) {
    return Promise.resolve(cachedClient);
  }

  if (!cachedClientPromise) {
    cachedClientPromise = PythLazerClient.create({
      token: config.pythApiKey,
      webSocketPoolConfig: {},
      ...(config.metadataServiceUrl ? { metadataServiceUrl: config.metadataServiceUrl } : {}),
      ...(config.priceServiceUrl ? { priceServiceUrl: config.priceServiceUrl } : {}),
    })
      .then((client) => {
        cachedClient = client;
        return client;
      })
      .catch((error) => {
        cachedClientPromise = null;
        throw error;
      });
  }

  return cachedClientPromise;
}

async function resolvePriceFeedId(
  client: PythLazerClient,
  symbolQuery: string,
  assetType: AssetType,
): Promise<number> {
  if (cachedResolvedPriceFeedId != null) {
    return cachedResolvedPriceFeedId;
  }

  const matches = await client.getSymbols({
    query: symbolQuery,
    ...(assetType ? { asset_type: assetType } : {}),
  });
  const match = selectBestSymbolMatch(matches, symbolQuery);
  if (!match) {
    throw new Error(`Unable to resolve a Pyth Lazer price feed for ${symbolQuery}`);
  }

  cachedResolvedPriceFeedId = match.pyth_lazer_id;
  return cachedResolvedPriceFeedId;
}

export async function GET() {
  const pythApiKey = readString("PYTH_API_KEY");
  if (!pythApiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "PYTH_API_KEY is not configured on the server runtime.",
      },
      { status: 503 },
    );
  }

  try {
    const symbolQuery = readString("PYTH_PRIMARY_SYMBOL_QUERY", "ADA/USD");
    const feedId = readString("PYTH_PRIMARY_FEED_ID", "pyth-ada-usd");
    const symbol = readString("PYTH_PRIMARY_SYMBOL", "ADA/USD");
    const assetType = readString("PYTH_PRIMARY_ASSET_TYPE", "crypto") as AssetType;
    const priceFeedId = readOptionalNumber("PYTH_PRIMARY_PRICE_FEED_ID");
    const streamChannel = readString("PYTH_STREAM_CHANNEL", "fixed_rate@200ms") as Channel;
    const metadataServiceUrl = readString("PYTH_METADATA_SERVICE_URL");
    const priceServiceUrl = readString("PYTH_PRICE_SERVICE_URL");

    const client = await getClient({
      pythApiKey,
      metadataServiceUrl,
      priceServiceUrl,
    });

    let actualPriceFeedId = priceFeedId;
    if (priceFeedId == null) {
      actualPriceFeedId = await resolvePriceFeedId(client, symbolQuery, assetType);
    }

    if (actualPriceFeedId == null) {
      throw new Error(`Unable to resolve a Pyth Lazer price feed for ${symbolQuery}`);
    }

    const raw = await client.getLatestPrice({
      channel: streamChannel,
      priceFeedIds: [actualPriceFeedId],
      properties: [
        "price",
        "emaPrice",
        "confidence",
        "publisherCount",
        "exponent",
        "feedUpdateTimestamp",
      ],
      formats: ["solana"],
      parsed: true,
      jsonBinaryEncoding: "hex",
    });

    const parsed = raw.parsed?.priceFeeds.find(
      (candidate) => candidate.priceFeedId === actualPriceFeedId,
    );
    if (!parsed) {
      throw new Error(`Pyth response did not include parsed payload for feed ${actualPriceFeedId}`);
    }

    const exponent = parseRequiredNumber(parsed.exponent, "exponent");
    const feedUpdateTimestampUs = normalizeTimestampUs(
      parseRequiredNumber(parsed.feedUpdateTimestamp, "feedUpdateTimestamp"),
    );
    const oracle: OracleSnapshot = {
      feedId,
      symbol,
      price: toDecimal(parseRequiredNumber(parsed.price, "price"), exponent),
      emaPrice: toDecimal(parseRequiredNumber(parsed.emaPrice, "emaPrice"), exponent),
      confidence: toDecimal(parseRequiredNumber(parsed.confidence, "confidence"), exponent),
      publisherCount: parsed.publisherCount ?? undefined,
      updatedAtMs: Math.trunc(feedUpdateTimestampUs / 1000),
    };

    return NextResponse.json({
      ok: true,
      source: "pyth_live",
      oracle,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch the live Pyth snapshot.",
      },
      { status: 502 },
    );
  }
}
