import { BenchmarkService } from "./benchmark-service";
import { GASTRONOMY_BENCHMARKS } from "./benchmark-catalog";

const FEEDS = {
  CORN_SPOT: GASTRONOMY_BENCHMARKS[0]?.id ?? 3018,
  CORN_FORWARD: GASTRONOMY_BENCHMARKS[1]?.id ?? 3019,
  RAW_SUGAR: GASTRONOMY_BENCHMARKS[2]?.id ?? 3015,
} as const;

async function validateSupplierPrice(
  supplierPriceUSD: number,
  commodity: keyof typeof FEEDS,
): Promise<boolean> {
  const service = new BenchmarkService();
  const benchmarkId = FEEDS[commodity];
  const benchmark = GASTRONOMY_BENCHMARKS.find((item) => item.id === benchmarkId);
  if (!benchmark) {
    throw new Error(`Unsupported commodity: ${commodity}`);
  }

  const [result] = await service.compareOffers([
    {
      productName: benchmark.displayName,
      categoryRoot: benchmark.marketFocus,
      baseUnit: benchmark.benchmarkUnit.replace("usd/", "") as "kg" | "lb" | "bushel" | "cwt" | "unit",
      baseUnitPrice: supplierPriceUSD,
      currency: "USD",
    },
  ]);

  if (!result || result.comparisonStatus === "no_benchmark" || result.comparisonPriceUsd === undefined) {
    throw new Error("No benchmark available for validation");
  }

  const maxAllowed = result.comparisonPriceUsd * 1.3;
  console.log(`Pyth ${commodity}: $${result.comparisonPriceUsd.toFixed(4)} USD`);
  console.log(`Supplier: $${supplierPriceUSD} USD`);
  console.log(`Max allowed: $${maxAllowed.toFixed(4)} USD`);
  console.log(`Valid: ${supplierPriceUSD <= maxAllowed ? "PASS" : "FAIL"}`);
  return supplierPriceUSD <= maxAllowed;
}

export { validateSupplierPrice, FEEDS };
