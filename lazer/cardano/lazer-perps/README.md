# Team Lazer Perps (ex Lazer RWA) — Pythathon Submission

## Details

Team Name: Lazer Perps
Submission Name: lazer-perps
Team Members: María Elisa Araya ([@ar3lisa](https://x.com/ar3lisa)), Bárbara Olivera ([@b4rbbb](https://x.com/b4rbbb))
Contact: https://x.com/ar3lisa / https://x.com/b4rbbb

## Project Description

Perpetual futures protocol on Cardano. Traders open leveraged long/short positions on RWA assets (Gold, Silver, Oil) using USDCx as collateral. Every action (open, close, liquidate) requires a fresh Pyth Lazer price witness in the transaction. No price → no trade.

### How Pyth is used

Every validator reads prices through `oracle_gate.ak` which calls `pyth.get_updates(pyth_id, self)` from the official `pyth-network/pyth-lazer-cardano` library. The off-chain orchestrator fetches signed prices from Pyth Lazer and embeds them using the zero-withdrawal pattern.

```
Pyth Lazer Server                         Cardano PreProd
     │                                          │
     │  "latest price for XAU/USD"              │
     ▼                                          │
 [Ed25519-signed price bytes]                   │
     │                                          │
     │        orchestrator.ts                   │
     │    ┌─────────┴───────────┐               │
     │    │ fetchPriceWitness() │               │
     │    │ • fetch price       │               │
     │    │ • resolve state ────┼──query──▶     │ Pyth State UTxO
     │    │ • zero-withdrawal   │               │
     │    └─────────┬───────────┘               │
     │              │                           │
     │    open / close / liquidate ──tx────▶    │
     │                                          ▼
     │                          ┌──────────────────────────┐
     │                          │   Pyth Withdraw Script   │
     │                          │   (verifies Ed25519)     │
     │                          └────────────┬─────────────┘
     │                                       │
     │                          ┌────────────▼─────────────┐
     │                          │   oracle_gate.ak          │
     │                          │   pyth.get_updates()      │
     │                          └────────────┬─────────────┘
     │                                       │
     │                    ┌──────────────┬────┴────┬──────────────┐
     │                    ▼              ▼         ▼              ▼
     │              open_position  close_position  liquidate  pool_manager
     └────────────────────────────────────────────────────────────┘
```

### Verified transactions on PreProd

| Type | Feed | Tx Hash |
|------|------|---------|
| Open position | XAUT/USD | [`69d0db00...`](https://preprod.cardanoscan.io/transaction/69d0db000faa767fccd3a0f5ed0f0780a56cbd14a99d7193301a123ede48a586) |
| Close position | XAUT/USD | [`bb0cf008...`](https://preprod.cardanoscan.io/transaction/bb0cf00872328e69ea4df1c9e4c748a9e1bec3cec111bc8be83fff9bca22a39d) |
| Liquidate | XAUT/USD | [`2d1176b8...`](https://preprod.cardanoscan.io/transaction/2d1176b8bfdb427fb7d73c8f09c8b950e9410959721c9ab05a1992c71a9fee19) |
