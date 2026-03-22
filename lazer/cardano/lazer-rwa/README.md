# Team Lazer RWA — Pythathon Submission

## Details

- **Team Name:** Lazer RWA
- **Submission Name:** lazer-rwa
- **Team Members:** María Elisa Araya ([@ar3lisa](https://x.com/ar3lisa)), Bárbara Olivera ([@b4rbbb](https://x.com/b4rbbb))
- **Contact:** https://x.com/ar3lisa / https://x.com/b4rbbb

## Project Description

A Cardano spending validator that consumes Pyth Lazer price feeds on-chain to enforce a collateral threshold on RWA (Real World Asset) prices — specifically gold (XAU/USD) and silver (XAG/USD).

### How Pyth is used

The project integrates Pyth price feeds at two levels:

**Off-chain (TypeScript):**
- Connects to Pyth Lazer WebSocket to stream real-time XAU/USD and XAG/USD prices
- Fetches the latest signed price update in `solana` binary format (shared by Cardano)
- Resolves the on-chain Pyth State UTxO and withdraw script hash via `@pythnetwork/pyth-lazer-cardano-js`
- Builds and submits Cardano transactions with the price update as a zero-withdrawal redeemer

**On-chain (Aiken):**
- Uses `pyth.get_updates(pyth_id, self)` from `pyth-network/pyth-lazer-cardano` to read verified price data from the transaction
- Extracts the price for a specific feed ID and checks it against a configurable threshold
- If collateral price (e.g. gold) is above the threshold → allows minting/borrowing
- If below → transaction fails on-chain

### Use case

Inspired by DeFi lending protocols: a user locks RWA-backed collateral and can only mint/borrow when the oracle price confirms the collateral value is sufficient. Closing a position is always allowed regardless of price.

## Architecture

```
Pyth Lazer Server                    Cardano PreProd
     │                                     │
     │  WebSocket/HTTP                     │
     │  "dame precio del RWA"              │
     ▼                                     │
 [bytes firmados del RWA]                  │
     │                                     │
     │     src/submit_tx_lazer_rwa.ts      │
     │              │                      │
     │    ┌─────────┴──────────┐           │
     │    │ 1. fetch price     │           │
     │    │ 2. resolve state ──┼──query──▶ │ Pyth State UTxO
     │    │ 3. build tx        │           │
     │    │ 4. sign + submit ──┼──tx────▶  │
     │    └────────────────────┘           │
     │                                     ▼
     │                          ┌─────────────────────┐
     │                          │ Pyth Withdraw Script │
     │                          │ (verifica firma)     │
     │                          └──────────┬──────────┘
     │                                     │
     │                          ┌──────────▼──────────┐
     │                          │lazer_rwa_threshold.ak│
     │                          │ (lee precio RWA,     │
     │                          │  chequea threshold)  │
     │                          └─────────────────────┘
```

## How to run

### Prerequisites

- Node.js v24+
- [Aiken](https://aiken-lang.org) v1.1+
- Pyth Lazer access token
- Cardano PreProd wallet with tADA

### Install dependencies

```bash
cd lazer/cardano/lazer-rwa
npm install
```

### 1. Stream RWA prices

```bash
ACCESS_TOKEN=<your-token> npm run fetch-prices
```

### 2. Compile the Aiken validator

```bash
cd onchain
aiken build
```

### 3. Submit a price verification transaction

```bash
ACCESS_TOKEN=<your-token> CARDANO_MNEMONIC="<your 24 words>" npm run submit-tx
```

### Verified transactions on PreProd

- [caaf9db719e015031bf4b6164184b95226b433d4eb29c80a8a4960f02c309be0](https://preprod.cardanoscan.io/transaction/caaf9db719e015031bf4b6164184b95226b433d4eb29c80a8a4960f02c309be0)
- [8fca5fdd8e831c5e1ee0d8417cfedae480b6d2a7374647ded100b440fca49e43](https://preprod.cardanoscan.io/transaction/8fca5fdd8e831c5e1ee0d8417cfedae480b6d2a7374647ded100b440fca49e43)

## Project structure

```
lazer-rwa/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── fetch_prices_lazer_rwa.ts    — Stream XAU/USD & XAG/USD from Pyth Lazer
│   └── submit_tx_lazer_rwa.ts       — Build & submit Cardano tx with Pyth price verification
└── onchain/
    ├── aiken.toml
    ├── plutus.json                   — Compiled Plutus V3 blueprint
    └── validators/
        └── lazer_rwa_threshold.ak    — Spending validator with price threshold logic
```
