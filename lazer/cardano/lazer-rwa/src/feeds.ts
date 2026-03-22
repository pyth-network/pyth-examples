/**
 * Supported RWA feed catalog for Pyth Lazer.
 *
 * Add new feeds here to make them available across all scripts.
 * Feed IDs from: https://docs.pyth.network/price-feeds/pro/price-feed-ids
 */

export interface RwaFeed {
  id: number;
  name: string;
  symbol: string;
  category: "metal" | "fx" | "energy" | "crypto-rwa";
  status: "stable" | "coming_soon" | "inactive";
}

export const CATALOG: RwaFeed[] = [
  // Metals
  { id: 346,  name: "Gold",       symbol: "XAU/USD",  category: "metal",      status: "stable" },
  { id: 345,  name: "Silver",     symbol: "XAG/USD",  category: "metal",      status: "stable" },
  { id: 1780, name: "Palladium",  symbol: "XPD/USD",  category: "metal",      status: "coming_soon" },
  { id: 1781, name: "Platinum",   symbol: "XPT/USD",  category: "metal",      status: "coming_soon" },
  { id: 2949, name: "Copper",     symbol: "XCU/USD",  category: "metal",      status: "coming_soon" },

  // Energy
  { id: 2950, name: "Oil (WTI)",  symbol: "XTI/USD",  category: "energy",     status: "coming_soon" },

  // FX
  { id: 62,   name: "EUR/USD",    symbol: "EUR/USD",  category: "fx",         status: "inactive" },
  { id: 132,  name: "GBP/USD",    symbol: "GBP/USD",  category: "fx",         status: "inactive" },

  // Crypto RWA tokens
  { id: 172,  name: "Tether Gold", symbol: "XAUT/USD", category: "crypto-rwa", status: "stable" },
];

/** Lookup by feed ID */
export function getFeed(id: number): RwaFeed | undefined {
  return CATALOG.find((f) => f.id === id);
}

/** Lookup by symbol (case-insensitive) */
export function getFeedBySymbol(symbol: string): RwaFeed | undefined {
  const s = symbol.toUpperCase();
  return CATALOG.find((f) => f.symbol === s);
}

/**
 * Parse feed IDs from a comma-separated string.
 * Accepts numeric IDs or symbols: "346,345" or "XAU/USD,XAG/USD"
 */
export function parseFeeds(input: string): number[] {
  return input.split(",").map((s) => {
    const trimmed = s.trim();
    const asNum = Number(trimmed);
    if (!isNaN(asNum)) return asNum;
    const feed = getFeedBySymbol(trimmed);
    if (!feed) throw new Error(`Unknown feed: ${trimmed}. Use a numeric ID or a symbol from the catalog.`);
    return feed.id;
  });
}

/** Get display name for a feed ID */
export function feedName(id: number): string {
  const feed = getFeed(id);
  return feed ? `${feed.symbol} (${feed.name})` : `Feed ${id}`;
}
