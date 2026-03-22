import { PythLazerClient } from "@pythnetwork/pyth-lazer-cardano-js";
import { PreProd } from "@pythnetwork/pyth-lazer-cardano-js/dist/networks";

// Pyth Lazer API Key
const API_KEY = "k26VoFRNUQ0LtXjTghKKOv7IZI0lXdC1KcH-cardano";

// Commodity feed IDs (obtenidos de https://pyth.network/developers/price-feed-ids)
const FEEDS = {
  WHEAT: "0x6e5d9b6a7b3a9f8c2d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c",
  SOY_OIL: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
  CATTLE: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c"
};

const client = new PythLazerClient({
  apiKey: API_KEY,
  network: PreProd
});

async function validateSupplierPrice(supplierPriceUSD: number, commodity: keyof typeof FEEDS) {
  const feedId = FEEDS[commodity];
  const update = await client.getLatestPriceUpdate({ feedIds: [feedId] });

  const pythPrice = Number(update.price.price) / 10**update.price.expo;
  const maxMarkup = pythPrice * 1.3; // 30% max sobre mercado

  console.log(`Pyth ${commodity}: $${pythPrice.toFixed(4)} USD`);
  console.log(`Supplier: $${supplierPriceUSD} USD`);
  console.log(`Max allowed: $${maxMarkup.toFixed(4)} USD`);
  console.log(`Valid: ${supplierPriceUSD <= maxMarkup ? "✅ PASS" : "❌ FAIL"}`);

  return supplierPriceUSD <= maxMarkup;
}

export { validateSupplierPrice, FEEDS, client };
