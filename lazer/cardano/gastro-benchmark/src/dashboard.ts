// GastroBenchmark — Fair Price Procurement for Restaurants
// Team Cuqui: Pablo Cardozo, Nashira Oropeza
//
// Compares supplier prices against Pyth Network commodity benchmarks

// Precios de proveedores argentinos (reales/realistas)
const SUPPLIERS = [
  // Harina/Trigo
  { name: "Molinos Río de la Plata", product: "Harina 000", priceUSD: 0.87 },
  { name: "Proveedor Norte",         product: "Harina 000", priceUSD: 0.95 },
  { name: "Minetti",                 product: "Harina 000", priceUSD: 0.82 },
  { name: "Distribuidora Premium",   product: "Harina 000", priceUSD: 1.05 },

  // Aceite de Soja
  { name: "La Serenísima",           product: "Aceite Soja", priceUSD: 1.31 },
  { name: "Distribuidora Sur",       product: "Aceite Soja", priceUSD: 1.18 },
  { name: "Natura",                  product: "Aceite Soja", priceUSD: 1.45 },
  { name: "Aceitera General",        product: "Aceite Soja", priceUSD: 1.52 },

  // Carne Vacuna
  { name: "Frigorífico ABC",         product: "Carne Vacuna", priceUSD: 4.20 },
  { name: "Carnes del Oeste",        product: "Carne Vacuna", priceUSD: 4.85 },
  { name: "Swift",                   product: "Carne Vacuna", priceUSD: 3.95 },
  { name: "Premium Meat",            product: "Carne Vacuna", priceUSD: 5.50 },
];

// Precios de referencia Pyth Network (commodities)
// NOTA: En producción, estos vendrían de Pyth Lazer API en tiempo real
const PYTH_BENCHMARKS: Record<string, number> = {
  "Harina 000": 0.82,    // Wheat (XW/USD) ~$0.82/kg
  "Aceite Soja": 1.22,   // Soybean Oil (XB/USD) ~$1.22/kg
  "Carne Vacuna": 4.10,  // Live Cattle (GF/USD) ~$4.10/kg
};

function runDashboard() {
  console.log("\n🍽️  GastroBenchmark — Fair Price Procurement for Restaurants\n");
  console.log("Team Cuqui: Pablo Cardozo, Nashira Oropeza\n");
  console.log("Price benchmarks from Pyth Network commodity feeds");
  console.log("─".repeat(76));

  // Mostrar precios de referencia
  console.log("\n📊 MARKET BENCHMARKS (Pyth Network):");
  console.log("   " + "─".repeat(64));
  console.log("   Commodity      | Feed ID       | Price (USD/kg)");
  console.log("   " + "─".repeat(64));
  console.log("   Harina 000     | WHEAT/USD     | $" + PYTH_BENCHMARKS["Harina 000"].toFixed(2));
  console.log("   Aceite Soja   | SOYBEAN_OIL/  | $" + PYTH_BENCHMARKS["Aceite Soja"].toFixed(2));
  console.log("   Carne Vacuna  | LIVE_CATTLE/  | $" + PYTH_BENCHMARKS["Carne Vacuna"].toFixed(2));
  console.log("   " + "─".repeat(64));

  // Mostrar comparativa de proveedores
  console.log("\n📋 SUPPLIER PRICE COMPARISON:");
  console.log("─".repeat(76));
  console.log(
    "Proveedor".padEnd(26) +
    "Producto".padEnd(14) +
    "Precio".padEnd(10) +
    "Ref. Pyth".padEnd(12) +
    "Markup"
  );
  console.log("─".repeat(76));

  let fairCount = 0;
  let warningCount = 0;
  let expensiveCount = 0;

  for (const s of SUPPLIERS) {
    const benchmark = PYTH_BENCHMARKS[s.product];
    const markup = ((s.priceUSD - benchmark) / benchmark) * 100;

    // Thresholds: 10% fair, 25% acceptable, >25% expensive
    const flag = markup > 25 ? "🔴" : markup > 10 ? "🟡" : "🟢";

    if (markup <= 10) fairCount++;
    else if (markup <= 25) warningCount++;
    else expensiveCount++;

    console.log(
      s.name.padEnd(26) +
      s.product.padEnd(14) +
      `$${s.priceUSD.toFixed(2)}`.padEnd(10) +
      `$${benchmark.toFixed(2)}`.padEnd(12) +
      `${flag} +${markup.toFixed(1)}%`
    );
  }

  console.log("─".repeat(76));
  console.log(`\n📊 Summary: ${fairCount} ✅ Fair | ${warningCount} ⚠️ Acceptable | ${expensiveCount} 🔴 Expensive`);

  console.log("\n🔗 How it works:");
  console.log("   1. Pyth Network provides real-time commodity price feeds");
  console.log("   2. Smart contract validates: supplier_price ≤ market_price × 1.30");
  console.log("   3. Purchase orders settled on Cardano with price attestation");

  console.log("\n🌾 Pyth Feeds for Food Commodities:");
  console.log("   ┌─ WHEAT/USD (XW)      → Harina/Trigo");
  console.log("   ├─ SOYBEAN_OIL/USD (XB) → Aceite de Soja");
  console.log("   └─ LIVE_CATTLE/USD (GF) → Carne Vacuna");

  console.log("\n💡 Business Value:");
  console.log("   • Restaurants stop overpaying for ingredients");
  console.log("   • Transparent price validation on-chain");
  console.log("   • Suppliers compete on fair pricing\n");
}

runDashboard();
