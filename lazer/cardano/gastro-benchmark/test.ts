import { validateSupplierPrice } from "./src/index";

// Precios mock de proveedores (normalizados por LiteParse pipeline)
const suppliers = [
  { product: "Harina (trigo)", priceUSD: 0.85 },
  { product: "Aceite soja", priceUSD: 1.25 },
  { product: "Carne vacuna", priceUSD: 4.50 }
];

async function main() {
  console.log("🍽️  GastroBenchmark - Price Validation\n");

  for (const s of suppliers) {
    console.log(`📦 ${s.product} - $${s.priceUSD}`);

    let commodity: "WHEAT" | "SOY_OIL" | "CATTLE";
    if (s.product.includes("Harina") || s.product.includes("trigo")) {
      commodity = "WHEAT";
    } else if (s.product.includes("Aceite") || s.product.includes("soja")) {
      commodity = "SOY_OIL";
    } else {
      commodity = "CATTLE";
    }

    await validateSupplierPrice(s.priceUSD, commodity);
    console.log("---");
  }
}

main().catch(console.error);
