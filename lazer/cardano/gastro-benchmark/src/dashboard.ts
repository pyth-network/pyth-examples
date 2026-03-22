// GastroBenchmark - Real-Time Price Comparison Dashboard
// Team Cuqui: Pablo Cardozo, Nashira Oropeza

const https = require("https");

// Proveedores crypto - precios fijos para comparar
const SUPPLIERS = [
  { name: "Binance", product: "Bitcoin", priceUSD: 69000 },
  { name: "Coinbase", product: "Bitcoin", priceUSD: 69500 },
  { name: "LocalBitcoins", product: "Bitcoin", priceUSD: 72000 },
  { name: "Binance", product: "Ethereum", priceUSD: 3500 },
  { name: "Coinbase", product: "Ethereum", priceUSD: 3550 },
  { name: "Crypto.com", product: "Ethereum", priceUSD: 3750 },
];

// Fetch precios reales desde CoinGecko (con User-Agent)
async function fetchRealPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = {
    "Bitcoin": 0,
    "Ethereum": 0,
  };

  try {
    console.log("📡 Fetching REAL prices from CoinGecko API...\n");

    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd";

    const data = await new Promise<any>((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'GastroBenchmark/1.0 (hackathon-demo@pyth.network)'
        }
      };
      https.get(url, options, (res: any) => {
        let body = "";
        res.on("data", (chunk: any) => body += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }).on("error", reject);
    });

    if (data.bitcoin?.usd) {
      prices["Bitcoin"] = data.bitcoin.usd;
      console.log(`   ✅ Bitcoin (BTC): $${data.bitcoin.usd.toLocaleString()}`);
    }
    if (data.ethereum?.usd) {
      prices["Ethereum"] = data.ethereum.usd;
      console.log(`   ✅ Ethereum (ETH): $${data.ethereum.usd.toLocaleString()}`);
    }

    console.log("\n   ↑↑↑ PRECIOS REALES DEL MERCADO ↑↑↑\n");

  } catch (error: any) {
    console.log(`   ⚠️ API error: ${error.message}`);
    console.log("   (usando fallback)\n");
    prices["Bitcoin"] = 68500;
    prices["Ethereum"] = 3450;
  }

  return prices;
}

async function runDashboard() {
  console.log("\n🍽️  GastroBenchmark — Real-Time Price Comparison\n");
  console.log("Team Cuqui: Pablo Cardozo, Nashira Oropeza");
  console.log("Time:", new Date().toISOString());
  console.log("\n🔗 Demo: Real crypto prices → simulating commodity price validation");

  // Fetch precios reales
  const marketPrices = await fetchRealPrices();

  // Mostrar comparativa
  console.log("─".repeat(76));
  console.log(
    "Exchange".padEnd(20) +
    "Crypto".padEnd(12) +
    "Price".padEnd(14) +
    "Market".padEnd(14) +
    "Premium"
  );
  console.log("─".repeat(76));

  let fairCount = 0;
  let warningCount = 0;
  let expensiveCount = 0;

  for (const s of SUPPLIERS) {
    const marketPrice = marketPrices[s.product];
    if (!marketPrice || marketPrice === 0) continue;

    const premium = ((s.priceUSD - marketPrice) / marketPrice) * 100;
    const flag = premium > 5 ? "🔴" : premium > 2 ? "🟡" : "🟢";

    if (premium <= 2) fairCount++;
    else if (premium <= 5) warningCount++;
    else expensiveCount++;

    console.log(
      s.name.padEnd(20) +
      s.product.padEnd(12) +
      `$${s.priceUSD.toLocaleString()}`.padEnd(14) +
      `$${marketPrice.toLocaleString()}`.padEnd(14) +
      `${flag} +${premium.toFixed(2)}%`
    );
  }

  console.log("─".repeat(76));
  console.log(`\n📊 Summary: ${fairCount} ✅ Fair | ${warningCount} ⚠️ OK | ${expensiveCount} 🔴 Premium`);

  console.log("\n🔗 Pyth Integration Architecture:");
  console.log("   Off-chain: Pyth Lazer SDK → real-time commodity prices");
  console.log("   On-chain:  Aiken validator → price ≤ market × 1.30");
  console.log("   Settlement: Cardano transaction with price attestation");

  console.log("\n🌾 Production feeds for GastroBenchmark:");
  console.log("   Wheat (XW/USD)      → Harina/Trigo");
  console.log("   Soybean Oil (XB/USD) → Aceite de Soja");
  console.log("   Live Cattle (GF/USD) → Carne Vacuna\n");
}

runDashboard().catch(console.error);
