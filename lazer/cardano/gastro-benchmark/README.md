# GastroBenchmark — Fair Price Procurement on Cardano

## Summary
A procurement platform for **restaurants** that validates supplier prices against Pyth Network's real-time commodity price feeds on Cardano.

## Problem
Restaurants overpay for ingredients because they lack transparent price benchmarks. Suppliers charge arbitrary markups with no market reference.

## Solution
GastroBenchmark compares food supplier prices against Pyth Network commodity feeds (wheat, soybean oil, live cattle) and validates fair pricing on-chain.

## Demo

```bash
npm install
npm run dashboard
```

**Output:**
```
🍽️  GastroBenchmark — Fair Price Procurement for Restaurants

📊 MARKET BENCHMARKS (Pyth Network):
   Harina 000     | WHEAT/USD     | $0.82
   Aceite Soja   | SOYBEAN_OIL/  | $1.22
   Carne Vacuna  | LIVE_CATTLE/  | $4.10

📋 SUPPLIER PRICE COMPARISON:
────────────────────────────────────────────────────────────
Proveedor                 Producto      Precio    Ref. Pyth   Markup
────────────────────────────────────────────────────────────
Molinos Río de la Plata   Harina 000    $0.87     $0.82       🟢 +6.1%
Proveedor Norte           Harina 000    $0.95     $0.82       🟡 +15.9%
La Serenísima             Aceite Soja   $1.31     $1.22       🟢 +7.4%
Premium Meat              Carne Vacuna  $5.50     $4.10       🔴 +34.1%
────────────────────────────────────────────────────────────
```

**Green 🟢** = Fair price (≤10% premium)
**Yellow 🟡** = Acceptable (≤25% premium)
**Red 🔴** = Overpriced (>25% premium)

## How it works
1. **Pyth Network** provides real-time commodity price feeds
2. **Smart contract** validates: `supplier_price ≤ market_price × 1.30`
3. **Purchase orders** settled on Cardano with price attestation

## Food Commodities
| Commodity | Pyth Feed | Use in Restaurants |
|-----------|-----------|-------------------|
| Harina 000 | WHEAT/USD (XW) | Bread, pasta, pastries |
| Aceite Soja | SOYBEAN_OIL/USD (XB) | Cooking, frying |
| Carne Vacuna | LIVE_CATTLE/USD (GF) | Steaks, cuts |

## Pyth Integration
- **Feeds:** Wheat (XW/USD), Soybean Oil (XB/USD), Live Cattle (GF/USD)
- **Network:** Cardano PreProd
- **Policy ID:** `d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6`
- **SDK:** `@pythnetwork/pyth-lazer-cardano-js`

## Project Structure
```
lazer/cardano/gastro-benchmark/
├── src/
│   ├── index.ts          # Pyth Lazer client setup
│   ├── onchain-update.ts # Price validation functions
│   └── dashboard.ts      # CLI dashboard demo
├── onchain/gastro_benchmark_working/
│   ├── validators/
│   │   └── gastro_benchmark.ak  # Aiken smart contract
│   └── plutus.json      # Compiled validator blueprint
└── README.md
```

## Tech Stack
- **Off-chain:** TypeScript, Node.js
- **On-chain:** Aiken (Cardano Plutus V3)
- **Oracle:** Pyth Network Lazer
- **Network:** Cardano PreProd Testnet

## Team: Cuqui
- **Pablo Cardozo** — Smart contracts & integration
- **Nashira Oropeza** — Data & dashboard

## Business Value
- Restaurants stop overpaying for ingredients
- Transparent price validation on-chain
- Suppliers compete on fair pricing

## Future Work
- [ ] Connect to live Pyth Lazer WebSocket API
- [ ] Deploy smart contract to Cardano PreProd
- [ ] Add more commodities (corn, coffee, sugar)
- [ ] Web UI for restaurant managers

## License
Apache-2.0
