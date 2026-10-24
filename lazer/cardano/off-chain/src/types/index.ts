export interface PriceUpdate {
  feedId: number;
  priceUsdCents: bigint;
  timestamp: number; // unix ms
  payload: Uint8Array; // raw signed Pyth payload for redeemer
}

export interface CachedPrice {
  update: PriceUpdate;
  receivedAt: number; // unix ms
}

// Mirrors Aiken datum constructors
export type OracleDatum =
  | { kind: "AnyPrice" }
  | { kind: "MinPrice"; minPriceUsdCents: bigint }
  | { kind: "MaxPrice"; maxPriceUsdCents: bigint }
  | { kind: "PriceRange"; loCents: bigint; hiCents: bigint };

export interface SpendParams {
  datum: OracleDatum;
  priceUpdate: PriceUpdate;
}
