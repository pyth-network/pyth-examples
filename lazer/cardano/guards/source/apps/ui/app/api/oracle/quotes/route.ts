import {
  PythLazerClient,
  type Channel,
  type SymbolResponse,
} from "@pythnetwork/pyth-lazer-sdk";
import { NextResponse } from "next/server";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

loadDotenv({ path: path.resolve(process.cwd(), ".env"), quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), "..", "..", ".env"), quiet: true });

interface QuoteRequest {
  key: string;
  feedId: string;
  symbol: string;
  symbolQuery: string;
}

interface ParsedPriceFeed {
  priceFeedId: number;
  price?: number | string;
  emaPrice?: number | string;
  confidence?: number | string;
  exponent?: number | string;
  feedUpdateTimestamp?: number | string;
  publisherCount?: number | null;
}

const QUOTES: QuoteRequest[] = [
  {
    key: "ada",
    feedId: "pyth-ada-usd",
    symbol: "ADA/USD",
    symbolQuery: "ADA/USD",
  },
  {
    key: "xau",
    feedId: "pyth-xau-usd",
    symbol: "XAU/USD",
    symbolQuery: "XAU/USD",
  },
  {
    key: "btc",
    feedId: "pyth-btc-usd",
    symbol: "BTC/USD",
    symbolQuery: "BTC/USD",
  },
  {
    key: "sol",
    feedId: "pyth-sol-usd",
    symbol: "SOL/USD",
    symbolQuery: "SOL/USD",
  },
  {
    key: "eur",
    feedId: "pyth-eur-usd",
    symbol: "EUR/USD",
    symbolQuery: "EUR/USD",
  },
];

let cachedClientInstance: PythLazerClient | null = null;
let cachedClientPromise: Promise<PythLazerClient> | null = null;
const cachedPriceFeedIds = new Map<string, number>();

function readString(name: string, fallback = ""): string {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0 ? value : fallback;
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

function toDecimal(value: number, exponent: number): number {
  return value * 10 ** exponent;
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

function findParsedFeed(
  feeds: ParsedPriceFeed[] | undefined,
  priceFeedId: number,
): ParsedPriceFeed {
  const feed = feeds?.find((candidate) => candidate.priceFeedId === priceFeedId);
  if (!feed) {
    throw new Error(`Pyth response did not include parsed payload for feed ${priceFeedId}`);
  }

  return feed;
}

function getClient(): Promise<PythLazerClient> {
  const pythApiKey = readString("PYTH_API_KEY");
  if (!pythApiKey) {
    throw new Error("PYTH_API_KEY is not configured on the server runtime.");
  }

  if (cachedClientInstance) {
    return Promise.resolve(cachedClientInstance);
  }

  if (!cachedClientPromise) {
    cachedClientPromise = PythLazerClient.create({
      token: pythApiKey,
      webSocketPoolConfig: {},
      ...(readString("PYTH_METADATA_SERVICE_URL")
        ? { metadataServiceUrl: readString("PYTH_METADATA_SERVICE_URL") }
        : {}),
      ...(readString("PYTH_PRICE_SERVICE_URL")
        ? { priceServiceUrl: readString("PYTH_PRICE_SERVICE_URL") }
        : {}),
    })
      .then((client) => {
        cachedClientInstance = client;
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
  quote: QuoteRequest,
): Promise<number> {
  const cached = cachedPriceFeedIds.get(quote.symbolQuery);
  if (cached != null) {
    return cached;
  }

  const matches = await client.getSymbols({ query: quote.symbolQuery });
  const match = selectBestSymbolMatch(matches, quote.symbolQuery);
  if (!match) {
    throw new Error(`Unable to resolve a Pyth Lazer price feed for ${quote.symbolQuery}`);
  }

  cachedPriceFeedIds.set(quote.symbolQuery, match.pyth_lazer_id);
  return match.pyth_lazer_id;
}

export async function GET() {
  if (!readString("PYTH_API_KEY")) {
    return NextResponse.json(
      { ok: false, error: "PYTH_API_KEY is not configured on the server runtime." },
      { status: 503 },
    );
  }

  try {
    const client = await getClient();

    const resolved = await Promise.all(
      QUOTES.map(async (quote) => {
        return {
          ...quote,
          priceFeedId: await resolvePriceFeedId(client, quote),
        };
      }),
    );

    const raw = await client.getLatestPrice({
      channel: readString("PYTH_STREAM_CHANNEL", "fixed_rate@200ms") as Channel,
      priceFeedIds: resolved.map((quote) => quote.priceFeedId),
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

    const quotes = Object.fromEntries(
      resolved.map((quote) => {
        const parsed = findParsedFeed(raw.parsed?.priceFeeds, quote.priceFeedId);
        const exponent = parseRequiredNumber(parsed.exponent, `${quote.symbol}.exponent`);
        const updatedAtUs = normalizeTimestampUs(
          parseRequiredNumber(parsed.feedUpdateTimestamp, `${quote.symbol}.feedUpdateTimestamp`),
        );

        return [
          quote.key,
          {
            feedId: quote.feedId,
            symbol: quote.symbol,
            price: toDecimal(parseRequiredNumber(parsed.price, `${quote.symbol}.price`), exponent),
            emaPrice: toDecimal(
              parseRequiredNumber(parsed.emaPrice, `${quote.symbol}.emaPrice`),
              exponent,
            ),
            confidence: toDecimal(
              parseRequiredNumber(parsed.confidence, `${quote.symbol}.confidence`),
              exponent,
            ),
            publisherCount: parsed.publisherCount ?? undefined,
            updatedAtMs: Math.trunc(updatedAtUs / 1000),
          },
        ];
      }),
    );

    return NextResponse.json({
      ok: true,
      source: "pyth_live",
      quotes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch live quotes from Pyth.",
      },
      { status: 502 },
    );
  }
}
