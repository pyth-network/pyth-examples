export type SupportedUnit = "usd/kg" | "usd/lb" | "usd/bushel" | "usd/cwt" | "usd/unit";

export type BenchmarkStatus =
  | "matched"
  | "no_pyth_cardano_coverage"
  | "market_closed_fallback_used"
  | "unit_not_comparable"
  | "future_mapping_candidate";

export type ComparisonStatus = "fair" | "watch" | "expensive" | "no_benchmark";

export type PriceSource = "latest" | "historical-fallback" | "unavailable";

export type BenchmarkKind = "direct_match" | "proxy_match" | "no_match_yet";

export type BenchmarkDefinition = {
  id: number;
  displayName: string;
  symbol: string;
  description: string;
  marketFocus: string;
  benchmarkUnit: SupportedUnit;
  supplierUnit?: string;
  channel: "fixed_rate@50ms" | "fixed_rate@1000ms" | "real_time";
  displayDivisor: number;
  commodityKey: string;
  commodityGroup: string;
  keywords: string[];
  categoryHints: string[];
  conversions: Partial<Record<SupportedUnit, number>>;
};

export type BenchmarkSnapshot = BenchmarkDefinition & {
  benchmarkPrice: number | null;
  confidence: number | null;
  exponent: number | null;
  publisherCount: number;
  marketSession: string;
  timestampUs: string | null;
  source: PriceSource;
};

export type BenchmarkHistoryPoint = {
  timestampUs: string;
  price: number | null;
  source: Exclude<PriceSource, "unavailable">;
};

export type CardanoCapability = {
  cardanoEnabled: boolean;
  pythCardanoSdkInstalled: boolean;
  lucidAvailable: boolean;
  note: string;
};

export type NormalizedSupplierOfferInput = {
  catalogProductId?: string;
  productName: string;
  categoryRoot?: string;
  baseUnit?: "kg" | "lb" | "bushel" | "cwt" | "unit" | "l";
  baseQuantity?: number;
  baseUnitPrice?: number;
  currency?: string;
  supplierSourceId?: string;
  supplierName?: string;
};

export type CommodityBenchmarkResult = {
  item: NormalizedSupplierOfferInput;
  benchmarkStatus: BenchmarkStatus;
  comparisonStatus: ComparisonStatus;
  benchmarkKind: BenchmarkKind;
  benchmarkRef?: {
    id: number;
    symbol: string;
    displayName: string;
    benchmarkUnit: SupportedUnit;
    source: PriceSource;
    timestampUs: string | null;
    marketSession: string;
  };
  internationalPriceUsd?: number;
  comparisonPriceUsd?: number;
  comparisonUnit?: SupportedUnit;
  markupPercent?: number;
  explanation: string;
};
