# GastroBenchmark — Fair Price Procurement on Cardano

## Summary
A procurement platform for Argentine restaurants that validates supplier prices
against real-time Pyth commodity price feeds on Cardano, ensuring kitchen managers
always pay a fair market price.

## Problem
Restaurants in Argentina overpay for ingredients because they lack transparent
price benchmarks. Suppliers charge arbitrary markups with no market reference.

## Solution
GastroBenchmark compares supplier prices against Pyth Network's real-time commodity
feeds (wheat, soybean oil, live cattle) and validates fair pricing on-chain.

## How it works
1. **Supplier prices** are ingested and normalized (flour, oil, beef)
2. **Pyth Lazer** provides real-time commodity benchmarks (XW/USD, XB/USD, GF/USD)
3. **Aiken smart contract** validates: `supplier_price ≤ market_price × 1.30`
4. **Dashboard** shows fair vs overpriced suppliers

## Demo

Run the price comparison dashboard:
```bash
npm install
npm run dashboard
```

Output:
```
🍽️  GastroBenchmark — Fair Price Procurement Dashboard

────────────────────────────────────────────────────────────────────────────
Proveedor                   Producto      Precio    Ref. Pyth   Markup
────────────────────────────────────────────────────────────────────────────
Molinos Río de la Plata     Harina 000    $0.87     $0.74       🟡 +17.6%
Proveedor Norte             Harina 000    $0.95     $0.74       🔴 +28.4%
La Serenísima               Aceite Soja   $1.31     $1.19       🟡 +10.1%
...
────────────────────────────────────────────────────────────────────────────
```

## Pyth Integration
- **Feeds:** Wheat (XW/USD), Soybean Oil (XB/USD), Live Cattle (GF/USD)
- **Network:** Cardano PreProd
- **Policy ID:** `d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6`
- **Max Markup:** 30% above market price

## Project Structure
```
lazer/cardano/gastro-benchmark/
├── src/
│   ├── index.ts          # Pyth Lazer client setup
│   ├── onchain-update.ts # Price validation functions
│   └── dashboard.ts      # CLI dashboard demo
├── onchain/gastro_benchmark_working/
│   └── validators/
│       └── gastro_benchmark.ak  # Aiken smart contract
└── plutus.json          # Compiled validator blueprint
```

## Tech Stack
- **Off-chain:** TypeScript, Node.js
- **On-chain:** Aiken (Cardano Plutus V3)
- **Oracle:** Pyth Network Lazer
- **Network:** Cardano PreProd Testnet

## Team: Cuqui
- **Pablo Cardozo** — Smart contracts & integration
- **Nashira Oropeza** — Data & dashboard

## Future Work
- [ ] Connect to live Pyth Lazer WebSocket API
- [ ] Deploy smart contract to Cardano PreProd
- [ ] Add more commodities (corn, coffee, sugar)
- [ ] Web UI for restaurant managers

## License
Apache-2.0
