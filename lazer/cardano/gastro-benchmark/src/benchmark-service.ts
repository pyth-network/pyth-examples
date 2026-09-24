import { GASTRONOMY_BENCHMARKS } from "./benchmark-catalog";
import { getCardanoCapability } from "./cardano-base";
import { fetchBenchmarkHistory, fetchLatestGastronomyBenchmarks, type PriceProvider } from "./pyth";
import type {
  BenchmarkDefinition,
  BenchmarkSnapshot,
  CommodityBenchmarkResult,
  ComparisonStatus,
  NormalizedSupplierOfferInput,
  SupportedUnit,
} from "./types";

const FAIR_THRESHOLD = 10;
const WATCH_THRESHOLD = 25;

function normalizeText(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function classifyMarkup(markup: number): ComparisonStatus {
  if (markup > WATCH_THRESHOLD) return "expensive";
  if (markup > FAIR_THRESHOLD) return "watch";
  return "fair";
}

function buildSearchHaystack(item: NormalizedSupplierOfferInput): string {
  return normalizeText([item.productName, item.categoryRoot].filter(Boolean).join(" "));
}

function pickBenchmark(item: NormalizedSupplierOfferInput): { benchmark?: BenchmarkDefinition; kind: "direct_match" | "proxy_match" | "no_match_yet" } {
  const haystack = buildSearchHaystack(item);

  for (const benchmark of GASTRONOMY_BENCHMARKS) {
    if (benchmark.keywords.some((keyword) => haystack.includes(normalizeText(keyword)))) {
      return { benchmark, kind: "direct_match" };
    }
  }

  for (const benchmark of GASTRONOMY_BENCHMARKS) {
    if ((item.categoryRoot ? benchmark.categoryHints.includes(normalizeText(item.categoryRoot)) : false) && benchmark.commodityGroup === "grains") {
      return { benchmark, kind: "proxy_match" };
    }
  }

  return { kind: "no_match_yet" };
}

function toComparisonUnit(baseUnit?: NormalizedSupplierOfferInput["baseUnit"]): SupportedUnit | null {
  if (!baseUnit) return null;
  if (baseUnit === "kg") return "usd/kg";
  if (baseUnit === "lb") return "usd/lb";
  if (baseUnit === "bushel") return "usd/bushel";
  if (baseUnit === "cwt") return "usd/cwt";
  if (baseUnit === "unit") return "usd/unit";
  return null;
}

function convertBenchmarkPrice(snapshot: BenchmarkSnapshot, comparisonUnit: SupportedUnit): number | null {
  const benchmarkPrice = snapshot.benchmarkPrice;
  if (benchmarkPrice === null) {
    return null;
  }

  const factor = snapshot.conversions[comparisonUnit];
  if (!factor) {
    return null;
  }

  return Number((benchmarkPrice * factor).toFixed(6));
}

export class BenchmarkService {
  constructor(private readonly provider?: PriceProvider) {}

  async getHealth() {
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      pythApiKeyConfigured: Boolean(process.env.PYTH_API_KEY),
      supportedBenchmarks: GASTRONOMY_BENCHMARKS.length,
      cardanoBase: getCardanoCapability(),
    };
  }

  async listFeeds() {
    return GASTRONOMY_BENCHMARKS.map((feed) => ({
      id: feed.id,
      symbol: feed.symbol,
      displayName: feed.displayName,
      description: feed.description,
      benchmarkUnit: feed.benchmarkUnit,
      commodityKey: feed.commodityKey,
      marketFocus: feed.marketFocus,
      coverageStatus: "supported_now",
      cardanoBase: true,
    }));
  }

  async getLatestBenchmarks() {
    return fetchLatestGastronomyBenchmarks(this.provider);
  }

  async getBenchmarkHistory(benchmarkId: number, points: number) {
    return fetchBenchmarkHistory(benchmarkId, points, this.provider);
  }

  async compareOffers(items: NormalizedSupplierOfferInput[]): Promise<CommodityBenchmarkResult[]> {
    const snapshots = await fetchLatestGastronomyBenchmarks(this.provider);
    const byId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));

    return items.map((item) => {
      const selection = pickBenchmark(item);
      if (!selection.benchmark) {
        return {
          item,
          benchmarkStatus: "no_pyth_cardano_coverage",
          comparisonStatus: "no_benchmark",
          benchmarkKind: "no_match_yet",
          explanation: "El producto parseado todavia no tiene un benchmark commodity disponible en Pyth/Cardano. Queda como candidato futuro de cobertura.",
        };
      }

      const snapshot = byId.get(selection.benchmark.id);
      if (!snapshot || snapshot.benchmarkPrice === null) {
        return {
          item,
          benchmarkStatus: "future_mapping_candidate",
          comparisonStatus: "no_benchmark",
          benchmarkKind: selection.kind,
          benchmarkRef: snapshot
            ? {
                id: snapshot.id,
                symbol: snapshot.symbol,
                displayName: snapshot.displayName,
                benchmarkUnit: snapshot.benchmarkUnit,
                source: snapshot.source,
                timestampUs: snapshot.timestampUs,
                marketSession: snapshot.marketSession,
              }
            : undefined,
          explanation: "Existe un benchmark mapeado, pero hoy no hay precio utilizable desde Pyth/Cardano para comparacion.",
        };
      }

      const comparisonUnit = toComparisonUnit(item.baseUnit);
      if (!comparisonUnit || item.baseUnitPrice === undefined) {
        return {
          item,
          benchmarkStatus: "unit_not_comparable",
          comparisonStatus: "no_benchmark",
          benchmarkKind: selection.kind,
          benchmarkRef: {
            id: snapshot.id,
            symbol: snapshot.symbol,
            displayName: snapshot.displayName,
            benchmarkUnit: snapshot.benchmarkUnit,
            source: snapshot.source,
            timestampUs: snapshot.timestampUs,
            marketSession: snapshot.marketSession,
          },
          explanation: "La oferta no trae una unidad base comparable o no incluye baseUnitPrice para contrastar contra el benchmark internacional.",
        };
      }

      const comparisonPriceUsd = convertBenchmarkPrice(snapshot, comparisonUnit);
      if (comparisonPriceUsd === null) {
        return {
          item,
          benchmarkStatus: "unit_not_comparable",
          comparisonStatus: "no_benchmark",
          benchmarkKind: selection.kind,
          benchmarkRef: {
            id: snapshot.id,
            symbol: snapshot.symbol,
            displayName: snapshot.displayName,
            benchmarkUnit: snapshot.benchmarkUnit,
            source: snapshot.source,
            timestampUs: snapshot.timestampUs,
            marketSession: snapshot.marketSession,
          },
          explanation: "El benchmark existe, pero la conversion entre la unidad del commodity y la unidad normalizada del producto todavia no esta soportada.",
        };
      }

      const markupPercent = Number(
        (((item.baseUnitPrice - comparisonPriceUsd) / comparisonPriceUsd) * 100).toFixed(2),
      );
      const benchmarkStatus =
        snapshot.source === "historical-fallback" ? "market_closed_fallback_used" : "matched";

      return {
        item,
        benchmarkStatus,
        comparisonStatus: classifyMarkup(markupPercent),
        benchmarkKind: selection.kind,
        benchmarkRef: {
          id: snapshot.id,
          symbol: snapshot.symbol,
          displayName: snapshot.displayName,
          benchmarkUnit: snapshot.benchmarkUnit,
          source: snapshot.source,
          timestampUs: snapshot.timestampUs,
          marketSession: snapshot.marketSession,
        },
        internationalPriceUsd: snapshot.benchmarkPrice,
        comparisonPriceUsd,
        comparisonUnit,
        markupPercent,
        explanation:
          selection.kind === "proxy_match"
            ? "La comparacion usa un proxy commodity de Pyth/Cardano. Es util como referencia internacional, pero no equivale a una cotizacion exacta del producto final."
            : "La comparacion usa un benchmark commodity disponible hoy en Pyth/Cardano y lo proyecta a la unidad normalizada del producto.",
      };
    });
  }
}
