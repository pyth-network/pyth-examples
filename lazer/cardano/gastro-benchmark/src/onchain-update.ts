import { BenchmarkService } from "./benchmark-service";
import { GASTRONOMY_BENCHMARKS } from "./benchmark-catalog";

const service = new BenchmarkService();

function mapProductToFeed(product: string): number {
  const lower = product.toLowerCase();
  if (lower.includes("azucar")) return 3015;
  if (lower.includes("forward")) return 3019;
  return 3018;
}

/**
 * Genera los updates de Pyth para incluir en una transacción Cardano
 * @param supplierProducts Lista de productos a validar
 * @returns Updates serializables para lucid-cardano
 */
export async function getPythUpdatesForTx(supplierProducts: string[]) {
  const feedIds = supplierProducts.map(mapProductToFeed);
  const uniqueFeedIds = [...new Set(feedIds)]; // Deduplicar feeds
  const updates = await Promise.all(
    uniqueFeedIds.map(async (feedId) => {
      const benchmark = GASTRONOMY_BENCHMARKS.find((item) => item.id === feedId);
      if (!benchmark) {
        return null;
      }
      const { history } = await service.getBenchmarkHistory(feedId, 1);
      return {
        feedId,
        benchmark: benchmark.symbol,
        latestUsd: history[history.length - 1]?.price ?? null,
      };
    }),
  );

  return {
    updates: updates.filter(Boolean),
    feedIds: uniqueFeedIds
  };
}

/**
 * Valida si un precio de proveedor es justo basado en Pyth
 * @param product Nombre del producto
 * @param supplierPriceUSD Precio del proveedor en USD
 * @param maxMarkupPercentage Máximo markup permitido (default 30%)
 */
export async function isFairPrice(
  product: string,
  supplierPriceUSD: number,
  maxMarkupPercentage: number = 30
): Promise<boolean> {
  const [comparison] = await service.compareOffers([
    {
      productName: product,
      baseUnitPrice: supplierPriceUSD,
      currency: "USD",
      baseUnit: product.toLowerCase().includes("azucar") ? "lb" : "bushel",
    },
  ]);

  if (!comparison?.comparisonPriceUsd) {
    return false;
  }

  const maxAllowed = comparison.comparisonPriceUsd * (1 + maxMarkupPercentage / 100);
  return supplierPriceUSD <= maxAllowed;
}
