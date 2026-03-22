# Team Lazer Perps (ex Lazer RWA) — Pythathon Submission

## Details

- **Team Name:** Lazer Perps
- **Submission Name:** lazer-perps
- **Team Members:** María Elisa Araya ([@ar3lisa](https://x.com/ar3lisa)), Bárbara Olivera ([@b4rbbb](https://x.com/b4rbbb))
- **Contact:** https://x.com/ar3lisa / https://x.com/b4rbbb

## Project Description

Lazer Perps is a perpetual futures protocol on Cardano where traders open leveraged long/short positions on real-world assets (Gold, Silver, Oil) using collateral. Every action (open, close, liquidate) requires a fresh Pyth Lazer price witness embedded in the transaction. No price witness → no trade.

All positions are independent eUTxOs on-chain.

### How Pyth is used

Pyth Lazer is the **mandatory oracle** for every operation in the protocol:

**On-chain (Aiken — `perps.ak`):**
- Uses `pyth.get_updates(pyth_id, self)` to read verified price data from the transaction
- `OpenPosition`: validates entry price matches oracle, checks leverage limits
- `ClosePosition`: reads current price to compute PnL, verifies owner signature
- `Liquidate`: computes margin ratio from oracle price — if undercollateralized, anyone can liquidate

**Off-chain (TypeScript):**
- Fetches signed price updates from Pyth Lazer via WebSocket/HTTP
- Resolves the on-chain Pyth State UTxO via `@pythnetwork/pyth-lazer-cardano-js`
- Embeds the price witness in every transaction using the zero-withdrawal pattern

**Key principle:** The Pyth withdraw script verifies the Ed25519 signature and makes the price available. The perps validator reads it in the same transaction. Without the price witness, the validator fails.

### Supported markets

| Symbol | Asset | Feed ID | Status |
|--------|-------|---------|--------|
| XAU/USD | Gold | 346 | stable |
| XAG/USD | Silver | 345 | stable |
| XAUT/USD | Tether Gold | 172 | stable (24/7) |
| XTI/USD | Oil (WTI) | 2950 | coming soon |

## Architecture

```
Pyth Lazer Server                         Cardano PreProd
     │                                          │
     │  WebSocket/HTTP                          │
     │  "latest price for XAU/USD"              │
     ▼                                          │
 [Ed25519-signed price bytes]                   │
     │                                          │
     │      src/open_position.ts                │
     │              │                           │
     │    ┌─────────┴───────────┐               │
     │    │ 1. fetch price      │               │
     │    │ 2. resolve state ───┼──query──▶     │ Pyth State UTxO
     │    │ 3. build tx         │               │
     │    │    (withdraw +      │               │
     │    │     open position)  │               │
     │    │ 4. sign + submit ───┼──tx────▶      │
     │    └─────────────────────┘               │
     │                                          ▼
     │                          ┌──────────────────────────┐
     │                          │   Pyth Withdraw Script   │
     │                          │   (verifies Ed25519      │
     │                          │    signature on price)   │
     │                          └────────────┬─────────────┘
     │                                       │ price available
     │                          ┌────────────▼─────────────┐
     │                          │     perps.ak validator   │
     │                          │                          │
     │                          │  OpenPosition:           │
     │                          │   • entry price = oracle │
     │                          │   • leverage ≤ max       │
     │                          │                          │
     │                          │  ClosePosition:          │
     │                          │   • compute PnL          │
     │                          │   • verify owner sig     │
     │                          │                          │
     │                          │  Liquidate:              │
     │                          │   • margin ratio < 80%   │
     │                          │   • anyone can trigger   │
     │                          └──────────────────────────┘
```

## How to run

### Prerequisites

- Node.js v24+
- [Aiken](https://aiken-lang.org) v1.1+
- Pyth Lazer access token
- Cardano PreProd wallet with tADA

### Install dependencies

```bash
cd lazer/cardano/lazer-perps
npm install
```

### 1. Stream prices

```bash
ACCESS_TOKEN=<your-token> npm run fetch-prices
ACCESS_TOKEN=<your-token> FEEDS=XAU/USD,XAUT/USD npm run fetch-prices
```

### 2. Compile validators

```bash
cd onchain
aiken build
```

### 3. Open a position with price witness

```bash
ACCESS_TOKEN=<your-token> CARDANO_MNEMONIC="<24 words>" npm run open-position
ACCESS_TOKEN=<your-token> CARDANO_MNEMONIC="..." FEED=XAUT/USD DIRECTION=long LEVERAGE=5 npm run open-position
```

### Verified transactions on PreProd

| Type | Feed | Tx Hash |
|------|------|---------|
| *(transactions will be added after testing)* | | |

## Project structure

```
lazer-perps/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── feeds.ts              — Perps market feed catalog
│   ├── fetch_prices.ts       — Stream RWA prices from Pyth Lazer
│   └── open_position.ts      — Open a leveraged position with price witness
└── onchain/
    ├── aiken.toml
    ├── plutus.json            — Compiled Plutus V3 blueprint
    └── validators/
        └── perps.ak           — Perpetual futures validator (open/close/liquidate)
```
