/**
 * Lazer Perps — Supported price feed catalog
 *
 * RWA feeds available for perpetual trading on Pyth Lazer.
 * Feed IDs from: https://docs.pyth.network/price-feeds/pro/price-feed-ids
 */

export interface PerpFeed {
  id: number;
  name: string;
  symbol: string;
  category: "metal" | "energy" | "crypto-rwa";
  status: "stable" | "coming_soon";
}

export const CATALOG: PerpFeed[] = [
  // Metals — primary perps markets
  { id: 346,  name: "Gold",        symbol: "XAU/USD",  category: "metal",      status: "stable" },
  { id: 345,  name: "Silver",      symbol: "XAG/USD",  category: "metal",      status: "stable" },

  // Energy
  { id: 2950, name: "Oil (WTI)",   symbol: "XTI/USD",  category: "energy",     status: "coming_soon" },

  // Crypto RWA — 24/7 market, ideal for testing
  { id: 172,  name: "Tether Gold", symbol: "XAUT/USD", category: "crypto-rwa", status: "stable" },
];

export function getFeed(id: number): PerpFeed | undefined {
  return CATALOG.find((f) => f.id === id);
}

export function getFeedBySymbol(symbol: string): PerpFeed | undefined {
  const s = symbol.toUpperCase();
  return CATALOG.find((f) => f.symbol === s);
}

export function parseFeeds(input: string): number[] {
  return input.split(",").map((s) => {
    const trimmed = s.trim();
    const asNum = Number(trimmed);
    if (!isNaN(asNum)) return asNum;
    const feed = getFeedBySymbol(trimmed);
    if (!feed) throw new Error(`Unknown feed: ${trimmed}`);
    return feed.id;
  });
}

export function feedName(id: number): string {
  const feed = getFeed(id);
  return feed ? `${feed.symbol} (${feed.name})` : `Feed ${id}`;
}
