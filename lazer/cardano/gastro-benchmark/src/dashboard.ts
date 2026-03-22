import {
  fetchLatestGastronomyBenchmarks,
  shutdownPythClient,
  type ResolvedBenchmark,
} from "./pyth";

type SupplierQuote = {
  supplier: string;
  product: string;
  benchmarkId: number;
  quotedPrice: number;
};

const SUPPLIER_QUOTES: SupplierQuote[] = [
  { supplier: "Molino Andino", product: "Harina de maiz spot", benchmarkId: 3018, quotedPrice: 4.58 },
  { supplier: "Distribuidora Norte", product: "Harina de maiz spot", benchmarkId: 3018, quotedPrice: 4.83 },
  { supplier: "Cocina Mayorista", product: "Harina de maiz spot", benchmarkId: 3018, quotedPrice: 4.44 },
  { supplier: "Reserva de Cocina", product: "Maiz forward Jul-26", benchmarkId: 3019, quotedPrice: 4.71 },
  { supplier: "AgroMenu", product: "Maiz forward Jul-26", benchmarkId: 3019, quotedPrice: 4.96 },
  { supplier: "Despensa Central", product: "Azucar cruda Apr-26", benchmarkId: 3015, quotedPrice: 0.22 },
];

function formatMoney(value: number | null, unit: string): string {
  return value === null ? "N/D" : `$${value.toFixed(4)} ${unit}`;
}

function formatConfidence(value: number | null): string {
  return value === null ? "N/D" : `+/-$${value.toFixed(4)}`;
}

function formatTimestamp(timestampUs: string | null): string {
  if (!timestampUs) {
    return "N/D";
  }

  const milliseconds = Number(timestampUs) / 1000;
  if (!Number.isFinite(milliseconds)) {
    return "N/D";
  }

  return new Date(milliseconds).toISOString();
}

function classifyMarkup(markup: number): string {
  if (markup > 25) return "RED";
  if (markup > 10) return "YELLOW";
  return "GREEN";
}

function printBenchmarks(benchmarks: ResolvedBenchmark[]) {
  console.log("\nREAL-TIME PYTH BENCHMARKS (commodity only)");
  console.log("=".repeat(114));
  console.log(
    "Feed".padEnd(20) +
      "Symbol".padEnd(26) +
      "Price".padEnd(22) +
      "Confidence".padEnd(18) +
      "Session".padEnd(10) +
      "Publishers",
  );
  console.log("-".repeat(114));

  for (const benchmark of benchmarks) {
    console.log(
      benchmark.displayName.padEnd(20) +
        benchmark.symbol.padEnd(26) +
        formatMoney(benchmark.benchmarkPrice, benchmark.supplierUnit).padEnd(22) +
        formatConfidence(benchmark.confidence).padEnd(18) +
        benchmark.marketSession.padEnd(10) +
        String(benchmark.publisherCount),
    );
  }

  console.log("-".repeat(114));
}

function printSupplierComparison(benchmarks: ResolvedBenchmark[]) {
  const benchmarkMap = new Map(benchmarks.map((item) => [item.id, item]));

  let fairCount = 0;
  let warningCount = 0;
  let expensiveCount = 0;
  let unavailableCount = 0;

  console.log("\nSUPPLIER COMPARISON AGAINST LIVE PYTH FEEDS");
  console.log("=".repeat(132));
  console.log(
    "Supplier".padEnd(22) +
      "Product".padEnd(24) +
      "Supplier Quote".padEnd(22) +
      "Pyth Ref".padEnd(20) +
      "Status".padEnd(14) +
      "Markup",
  );
  console.log("-".repeat(132));

  for (const quote of SUPPLIER_QUOTES) {
    const benchmark = benchmarkMap.get(quote.benchmarkId);
    if (!benchmark) {
      continue;
    }

    const quoteLabel = `$${quote.quotedPrice.toFixed(4)} ${benchmark.supplierUnit}`;

    if (benchmark.benchmarkPrice === null) {
      unavailableCount++;
      console.log(
        quote.supplier.padEnd(22) +
          quote.product.padEnd(24) +
          quoteLabel.padEnd(22) +
          "N/D".padEnd(20) +
          "NO_LIVE_PRICE".padEnd(14) +
          `market ${benchmark.marketSession}`,
      );
      continue;
    }

    const markup = ((quote.quotedPrice - benchmark.benchmarkPrice) / benchmark.benchmarkPrice) * 100;
    const status = classifyMarkup(markup);

    if (status === "GREEN") fairCount++;
    else if (status === "YELLOW") warningCount++;
    else expensiveCount++;

    console.log(
      quote.supplier.padEnd(22) +
        quote.product.padEnd(24) +
        quoteLabel.padEnd(22) +
        formatMoney(benchmark.benchmarkPrice, benchmark.supplierUnit).padEnd(20) +
        status.padEnd(14) +
        `${markup >= 0 ? "+" : ""}${markup.toFixed(1)}%`,
    );
  }

  console.log("-".repeat(132));
  console.log(
    `Summary: ${fairCount} fair | ${warningCount} watch | ${expensiveCount} expensive | ${unavailableCount} without live benchmark`,
  );
}

function printNotes(benchmarks: ResolvedBenchmark[]) {
  console.log("\nNOTES");
  console.log("=".repeat(114));
  console.log("1. All benchmark rows come from Pyth Pro `/v1/latest_price` using `PYTH_API_KEY` from `.env`.");
  console.log("2. The dashboard is intentionally limited to commodity feeds with gastronomy relevance.");
  console.log("3. If `latest_price` arrives without a live price because the market is closed, the app backfills the last official Pyth print with `getPrice` on recent historical timestamps.");

  for (const [index, benchmark] of benchmarks.entries()) {
    console.log(
      `${index + 4}. ${benchmark.displayName}: ${benchmark.description} Last API timestamp ${formatTimestamp(benchmark.timestampUs)}. Source ${benchmark.source}.`,
    );
  }

  console.log(`${benchmarks.length + 4}. Corn futures are normalized from exchange-style cents per bushel into USD per bushel for supplier comparison. This normalization is an implementation inference based on market convention.`);
}

async function runDashboard() {
  const benchmarks = await fetchLatestGastronomyBenchmarks();

  console.log("\nGastroBenchmark");
  console.log("Focused commodity monitor for restaurant procurement");
  console.log(`Snapshot: ${new Date().toISOString()}`);

  printBenchmarks(benchmarks);
  printSupplierComparison(benchmarks);
  printNotes(benchmarks);
  console.log("");
}

runDashboard().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Dashboard failed: ${message}`);
  process.exitCode = 1;
}).finally(async () => {
  await shutdownPythClient();
});
