// Mirrors Aiken OracleDatum constructors (on-chain/lib/pyth_types.ak)
export type OracleDatum =
  | { kind: "AnyPrice" }
  | { kind: "MinPrice"; minPriceUsdCents: number }
  | { kind: "MaxPrice"; maxPriceUsdCents: number }
  | { kind: "PriceRange"; loCents: number; hiCents: number };

export interface PriceUpdate {
  feedId: number;
  priceUsdCents: string; // bigint serialised as string for JSON transport
  timestamp: number; // unix ms
}

export interface ActionDecision {
  action: "lock" | "spend" | "block";
  reason: string;
}

export interface TxBuildResult {
  txHash: string;
  kind: "lock" | "spend";
  status: "dry-run" | "submitted" | "confirmed";
  scriptAddress: string;
  datum: OracleDatum;
  lovelace?: string;
  network?: string;
  explorerUrl?: string;
}

export interface WalletInfo {
  address: string;
  pkh: string;
  scriptAddress: string;
  network: string;
  balanceLovelace?: string;
  configured: boolean;
}

export interface DecisionConfig {
  datumKind: OracleDatum["kind"];
  minPriceUsdCents: number;
  maxPriceUsdCents: number;
  maxAgeSeconds: number;
}

export interface HealthResponse {
  status: string;
  wallet?: string;
  network?: string;
}

export interface ServiceStatus {
  pyth: boolean;
  blockfrost: boolean;
}
