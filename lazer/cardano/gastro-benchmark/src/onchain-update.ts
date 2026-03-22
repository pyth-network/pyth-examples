import { client, FEEDS } from "./index";

// Mapea productos a sus correspondientes Pyth feeds
function mapProductToFeed(product: string): string {
  const lower = product.toLowerCase();
  if (lower.includes("harina") || lower.includes("trigo")) return FEEDS.WHEAT;
  if (lower.includes("aceite") || lower.includes("soja")) return FEEDS.SOY_OIL;
  return FEEDS.CATTLE;
}

/**
 * Genera los updates de Pyth para incluir en una transacción Cardano
 * @param supplierProducts Lista de productos a validar
 * @returns Updates serializables para lucid-cardano
 */
export async function getPythUpdatesForTx(supplierProducts: string[]) {
  const feedIds = supplierProducts.map(mapProductToFeed);
  const uniqueFeedIds = [...new Set(feedIds)]; // Deduplicar feeds

  const updates = await client.getLatestPriceUpdate({ feedIds: uniqueFeedIds });

  return {
    updates,
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
  const feedId = mapProductToFeed(product);
  const update = await client.getLatestPriceUpdate({ feedIds: [feedId] });

  const pythPrice = Number(update.price.price) / 10**update.price.expo;
  const maxAllowed = pythPrice * (1 + maxMarkupPercentage / 100);

  return supplierPriceUSD <= maxAllowed;
}
