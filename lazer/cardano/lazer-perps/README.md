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
| Open position | XAUT/USD | [`4a8cb360...`](https://preprod.cardanoscan.io/transaction/4a8cb3609e07ffa89c9432b9dc314ef055b1dc12de63283ec606e588bc846be3) |
| Close position | XAUT/USD | [`bb0cf008...`](https://preprod.cardanoscan.io/transaction/bb0cf00872328e69ea4df1c9e4c748a9e1bec3cec111bc8be83fff9bca22a39d) |
| Liquidate | XAUT/USD | [`10ca9718...`](https://preprod.cardanoscan.io/transaction/10ca971882a1cae4ce0a50c0f3b4508b72e1fb60e225539db5ab7474cb494fb8) |
