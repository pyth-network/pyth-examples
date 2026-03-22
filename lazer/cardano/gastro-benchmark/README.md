# GastroBenchmark — Fair Price Procurement on Cardano

## Summary
A procurement platform for restaurants that validates supplier prices against real-time market price feeds on Cardano, ensuring buyers always pay a fair market price.

## Problem
Restaurants overpay for ingredients because they lack transparent price benchmarks. Suppliers charge arbitrary markups with no market reference.

## Solution
GastroBenchmark compares supplier prices against real-time market feeds and validates fair pricing on-chain using a Cardano smart contract.

## Demo — Real-Time Prices

The dashboard fetches **live prices** from CoinGecko API:

```bash
npm install
npm run dashboard
```

**Output:**
```
🍽️  GastroBenchmark — Real-Time Price Comparison

📡 Fetching REAL prices from CoinGecko API...
   ✅ Bitcoin (BTC): $68,546
   ✅ Ethereum (ETH): $2,069

────────────────────────────────────────────────────────────────────────────
Exchange            Crypto      Price         Market        Premium
────────────────────────────────────────────────────────────────────────────
Binance             Bitcoin     $69,000       $68,546       🟢 +0.66%
Coinbase            Bitcoin     $69,500       $68,546       🟢 +1.39%
LocalBitcoins       Bitcoin     $72,000       $68,546       🔴 +5.04%
────────────────────────────────────────────────────────────────────────────
```

**Green 🟢** = Fair price (≤2% premium)
**Yellow 🟡** = Acceptable (≤5% premium)
**Red 🔴** = Overpriced (>5% premium)

## How it works
1. **Fetch market prices** from external API (CoinGecko demo, Pyth in production)
2. **Compare** supplier prices against market benchmark
3. **Smart contract** validates: `supplier_price ≤ market_price × threshold`
4. **Settlement** on Cardano with price attestation

## Pyth Integration (Production)
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
│   └── dashboard.ts      # CLI dashboard with real prices
├── onchain/gastro_benchmark_working/
│   └── validators/
│       └── gastro_benchmark.ak  # Aiken smart contract
└── plutus.json          # Compiled validator blueprint
```

## Tech Stack
- **Off-chain:** TypeScript, Node.js, CoinGecko API (demo)
- **On-chain:** Aiken (Cardano Plutus V3)
- **Oracle:** Pyth Network Lazer (production)
- **Network:** Cardano PreProd Testnet

## Team: Cuqui
- **Pablo Cardozo** — Smart contracts & integration
- **Nashira Oropeza** — Data & dashboard

## Future Work
- [ ] Connect to live Pyth Lazer WebSocket API
- [ ] Add commodity feeds (wheat, soy oil, cattle)
- [ ] Deploy smart contract to Cardano PreProd
- [ ] Web UI for restaurant managers
- [ ] Mobile app for on-the-go verification

## License
Apache-2.0
