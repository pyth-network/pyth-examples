import type { BenchmarkDefinition } from "./types";

export const GASTRONOMY_BENCHMARKS: BenchmarkDefinition[] = [
  {
    id: 3018,
    displayName: "Corn May 2026",
    symbol: "Commodities.COK6/USD",
    description: "Corn futures used as a maize benchmark for corn flour, polenta and tortillas.",
    marketFocus: "Polenta, harina de maiz, tortillas, snacks de maiz",
    benchmarkUnit: "usd/bushel",
    supplierUnit: "USD/bushel",
    channel: "fixed_rate@50ms",
    displayDivisor: 100,
    commodityKey: "corn",
    commodityGroup: "grains",
    keywords: ["maiz", "corn", "polenta", "tortilla", "harina de maiz", "masa", "arepa"],
    categoryHints: ["harinas", "almacen", "granos", "secos"],
    conversions: {
      "usd/bushel": 1,
      "usd/kg": 1 / 25.40117272,
    },
  },
  {
    id: 3019,
    displayName: "Corn Jul 2026",
    symbol: "Commodities.CON6/USD",
    description: "Corn futures used as a forward maize benchmark for planned procurement.",
    marketFocus: "Planificacion estacional y compras futuras de maiz",
    benchmarkUnit: "usd/bushel",
    supplierUnit: "USD/bushel",
    channel: "fixed_rate@50ms",
    displayDivisor: 100,
    commodityKey: "corn-forward",
    commodityGroup: "grains",
    keywords: ["maiz", "corn", "forward", "futuro maiz"],
    categoryHints: ["harinas", "almacen", "granos", "secos"],
    conversions: {
      "usd/bushel": 1,
      "usd/kg": 1 / 25.40117272,
    },
  },
  {
    id: 3015,
    displayName: "Raw Sugar Apr 2026",
    symbol: "Commodities.SBK6/USD",
    description: "Raw sugar benchmark for sweeteners and dessert inputs.",
    marketFocus: "Azucar cruda, reposteria, bebidas, postres",
    benchmarkUnit: "usd/lb",
    supplierUnit: "USD/lb",
    channel: "fixed_rate@50ms",
    displayDivisor: 100,
    commodityKey: "raw-sugar",
    commodityGroup: "sweeteners",
    keywords: ["azucar", "sugar", "azucar cruda", "endulzante"],
    categoryHints: ["almacen", "secos", "reposteria"],
    conversions: {
      "usd/lb": 1,
      "usd/kg": 2.2046226218,
    },
  },
];

export function findBenchmarkDefinition(id: number): BenchmarkDefinition | undefined {
  return GASTRONOMY_BENCHMARKS.find((benchmark) => benchmark.id === id);
}
