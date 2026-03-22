import assert from "assert";
import { BenchmarkService } from "./src/benchmark-service";
import { GASTRONOMY_BENCHMARKS } from "./src/benchmark-catalog";
import type { BenchmarkDefinition, BenchmarkHistoryPoint, BenchmarkSnapshot } from "./src/types";
import type { PriceProvider } from "./src/pyth";

class MockPriceProvider implements PriceProvider {
  constructor(private readonly snapshots: BenchmarkSnapshot[]) {}

  async getLatestSnapshot(feeds: BenchmarkDefinition[]): Promise<BenchmarkSnapshot[]> {
    return feeds.map((feed) => this.snapshots.find((snapshot) => snapshot.id === feed.id) ?? {
      ...feed,
      benchmarkPrice: null,
      confidence: null,
      exponent: null,
      publisherCount: 0,
      marketSession: "closed",
      timestampUs: null,
      source: "unavailable",
    });
  }

  async getHistoricalFallback(feed: BenchmarkDefinition): Promise<BenchmarkSnapshot | null> {
    return this.snapshots.find((snapshot) => snapshot.id === feed.id) ?? null;
  }

  async getHistory(feed: BenchmarkDefinition, points: number): Promise<BenchmarkHistoryPoint[]> {
    return Array.from({ length: points }, (_, index) => ({
      timestampUs: String(1_700_000_000_000_000 + index),
      price: this.snapshots.find((snapshot) => snapshot.id === feed.id)?.benchmarkPrice ?? null,
      source: "historical-fallback",
    }));
  }

  async shutdown(): Promise<void> {
    return;
  }
}

function buildSnapshot(id: number, benchmarkPrice: number, source: "latest" | "historical-fallback" = "latest"): BenchmarkSnapshot {
  const feed = GASTRONOMY_BENCHMARKS.find((item) => item.id === id);
  if (!feed) {
    throw new Error(`Missing benchmark ${id}`);
  }

  return {
    ...feed,
    benchmarkPrice,
    confidence: 0.01,
    exponent: -2,
    publisherCount: 12,
    marketSession: source === "latest" ? "open" : "closed",
    timestampUs: "1700000000000000",
    source,
  };
}

async function main() {
  const service = new BenchmarkService(
    new MockPriceProvider([
      buildSnapshot(3018, 4.5),
      buildSnapshot(3015, 0.25, "historical-fallback"),
    ]),
  );

  const [cornResult, sugarResult, uncoveredResult] = await service.compareOffers([
    {
      productName: "Harina de maiz amarilla",
      categoryRoot: "Harinas",
      baseUnit: "kg",
      baseUnitPrice: 0.2,
      currency: "USD",
      supplierName: "Molino Norte",
    },
    {
      productName: "Azucar refinada",
      categoryRoot: "Reposteria",
      baseUnit: "kg",
      baseUnitPrice: 0.7,
      currency: "USD",
      supplierName: "Dulce Sur",
    },
    {
      productName: "Queso muzzarella",
      categoryRoot: "Lacteos",
      baseUnit: "kg",
      baseUnitPrice: 5.2,
      currency: "USD",
      supplierName: "Lacteos del Plata",
    },
  ]);

  assert.equal(cornResult.benchmarkStatus, "matched");
  assert.equal(cornResult.comparisonStatus, "watch");
  assert.equal(cornResult.comparisonUnit, "usd/kg");
  assert.ok(cornResult.comparisonPriceUsd !== undefined);
  assert.ok(cornResult.markupPercent !== undefined);

  assert.equal(sugarResult.benchmarkStatus, "market_closed_fallback_used");
  assert.equal(sugarResult.comparisonStatus, "expensive");

  assert.equal(uncoveredResult.benchmarkStatus, "no_pyth_cardano_coverage");
  assert.equal(uncoveredResult.comparisonStatus, "no_benchmark");

  const history = await service.getBenchmarkHistory(3018, 3);
  assert.equal(history.history.length, 3);

  const health = await service.getHealth();
  assert.equal(health.cardanoBase.cardanoEnabled, true);

  console.log("All tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
