/**
 * Lazer Perps — Market catalog
 *
 * Each market has a Pyth feed ID and a leverage cap.
 * Deploy one set of validators per market without recompiling.
 */

export interface Market {
  id: number;
  name: string;
  symbol: string;
  leverageCap: number;
  category: "metal" | "energy" | "crypto-rwa";
  status: "stable" | "coming_soon";
}

export const MARKETS: Market[] = [
  { id: 346,  name: "Gold",        symbol: "XAU/USD",  leverageCap: 10, category: "metal",      status: "stable" },
  { id: 345,  name: "Silver",      symbol: "XAG/USD",  leverageCap: 10, category: "metal",      status: "stable" },
  { id: 2950, name: "Oil (WTI)",   symbol: "XTI/USD",  leverageCap: 5,  category: "energy",     status: "coming_soon" },
  { id: 172,  name: "Tether Gold", symbol: "XAUT/USD", leverageCap: 10, category: "crypto-rwa", status: "stable" },
];

export function getMarket(id: number): Market | undefined {
  return MARKETS.find((m) => m.id === id);
}

export function getMarketBySymbol(symbol: string): Market | undefined {
  return MARKETS.find((m) => m.symbol === symbol.toUpperCase());
}

export function parseFeed(input: string): number {
  const trimmed = input.trim();
  const asNum = Number(trimmed);
  if (!isNaN(asNum)) return asNum;
  const market = getMarketBySymbol(trimmed);
  if (!market) throw new Error(`Unknown market: ${trimmed}`);
  return market.id;
}

export function parseFeeds(input: string): number[] {
  return input.split(",").map(parseFeed);
}

export function feedName(id: number): string {
  const m = getMarket(id);
  return m ? `${m.symbol} (${m.name})` : `Feed ${id}`;
}
