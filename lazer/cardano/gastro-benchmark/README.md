# GastroBenchmark — Fair Price Procurement on Cardano

## Summary
A procurement platform for Argentine restaurants that validates supplier prices
against real-time Pyth commodity price feeds on Cardano, ensuring kitchen managers
always pay a fair market price.

## How it works
1. Supplier prices are ingested and normalized (flour, oil, beef, dairy)
2. Pyth Lazer feeds provide real-time commodity benchmarks (XW/USD, XB/USD, GF/USD)
3. A Cardano smart contract validates that supplier price ≤ market price × threshold
4. Purchase orders are settled on-chain with a verifiable Pyth price attestation

## Pyth Integration
- **Feeds used:** Wheat (XW/USD), Soybean Oil (XB/USD), Live Cattle (GF/USD)
- **SDK:** @pythnetwork/pyth-lazer-cardano-js
- **Network:** Cardano PreProd

## Tech Stack
- TypeScript + pyth-lazer-cardano-js (off-chain)
- Aiken (on-chain validator)
- Next.js (frontend)
- Node.js + LLM (price normalization pipeline)

## Team: Cuqui
- Pablo Cardozo
- Nashira Oropeza
