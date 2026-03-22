# Team Lazer RWA — Pythathon Submission

## Details

- **Team Name:** Lazer RWA
- **Submission Name:** lazer-rwa
- **Team Members:** María Elisa Araya ([@ar3lisa](https://x.com/ar3lisa)), Bárbara Olivera ([@b4rbbb](https://x.com/b4rbbb))
- **Contact:** https://x.com/ar3lisa / https://x.com/b4rbbb

## Project Description

A Cardano minting policy that consumes Pyth Lazer price feeds on-chain to mint RWA-backed tokens only when the oracle price meets a configurable threshold. Supports any RWA asset available on Pyth Lazer (metals, FX, energy, crypto-backed RWAs).

The minting policy is parameterized — each deployment is specific to one RWA feed and threshold, generating a unique policy ID. No recompilation needed to support new feeds.

### Supported RWA feeds

| Symbol | Asset | Feed ID | Status |
|--------|-------|---------|--------|
| XAU/USD | Gold | 346 | stable |
| XAG/USD | Silver | 345 | stable |
| XAUT/USD | Tether Gold | 172 | stable |
| XPD/USD | Palladium | 1780 | coming soon |
| XPT/USD | Platinum | 1781 | coming soon |
| XCU/USD | Copper | 2949 | coming soon |
| XTI/USD | Oil (WTI) | 2950 | coming soon |
| EUR/USD | Euro | 62 | inactive |
| GBP/USD | British Pound | 132 | inactive |

Feeds are configurable via env vars — both by symbol name or numeric ID.

### How Pyth is used

The project integrates Pyth price feeds at two levels:

**Off-chain (TypeScript):**
- Connects to Pyth Lazer WebSocket to stream real-time RWA prices
- Fetches the latest signed price update in `solana` binary format (shared by Cardano)
- Resolves the on-chain Pyth State UTxO and withdraw script hash via `@pythnetwork/pyth-lazer-cardano-js`
- Parameterizes the Aiken minting policy with the target feed and threshold
- Builds and submits Cardano transactions that verify the price and mint RWA tokens in a single tx

**On-chain (Aiken):**
- Uses `pyth.get_updates(pyth_id, self)` from `pyth-network/pyth-lazer-cardano` to read verified price data from the transaction
- Extracts the price for a specific feed ID and checks it against a configurable threshold
- If price >= threshold → minting is allowed (LAZER-RWA token is created on-chain)
- If below → transaction fails on-chain (minting blocked)
- Burning is always allowed

### Use case

Inspired by DeFi lending protocols: a user can only mint RWA-backed tokens when the oracle price confirms the underlying asset value is sufficient. This enables price-gated minting for tokenized commodities, synthetic assets, or collateral management on Cardano.

## Architecture

```
Pyth Lazer Server                    Cardano PreProd
     │                                     │
     │  WebSocket/HTTP                     │
     │  "dame precio del RWA"              │
     ▼                                     │
 [bytes firmados del RWA]                  │
     │                                     │
     │      src/mint_rwa_token.ts          │
     │              │                      │
     │    ┌─────────┴──────────┐           │
     │    │ 1. load blueprint  │           │
     │    │ 2. apply params    │           │
     │    │ 3. fetch price     │           │
     │    │ 4. resolve state ──┼──query──▶ │ Pyth State UTxO
     │    │ 5. build tx        │           │
     │    │    (withdraw +     │           │
     │    │     mint token)    │           │
     │    │ 6. sign + submit ──┼──tx────▶  │
     │    └────────────────────┘           │
     │                                     ▼
     │                          ┌─────────────────────┐
     │                          │ Pyth Withdraw Script │
     │                          │ (verifies Ed25519    │
     │                          │  signature)          │
     │                          └──────────┬──────────┘
     │                                     │
     │                          ┌──────────▼──────────┐
     │                          │  lazer_rwa_mint      │
     │                          │  (reads price,       │
     │                          │   checks threshold,  │
     │                          │   mints LAZER-RWA)   │
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
# Default feeds (XAU/USD + XAG/USD)
ACCESS_TOKEN=<your-token> npm run fetch-prices

# Custom feeds by symbol
ACCESS_TOKEN=<your-token> FEEDS=XAUT/USD,XAU/USD npm run fetch-prices

# Custom feeds by ID
ACCESS_TOKEN=<your-token> FEEDS=172,346,345 npm run fetch-prices
```

### 2. Compile the Aiken minting policy

```bash
cd onchain
aiken build
```

### 3. Submit a price verification transaction

```bash
# Default feed (XAU/USD)
ACCESS_TOKEN=<your-token> CARDANO_MNEMONIC="<your 24 words>" npm run submit-tx

# Specific feed
ACCESS_TOKEN=<your-token> CARDANO_MNEMONIC="<your 24 words>" FEED=XAUT/USD npm run submit-tx
```

### 4. Mint an RWA-backed token

```bash
# Mint LAZER-RWA token backed by XAUT/USD price
ACCESS_TOKEN=<your-token> CARDANO_MNEMONIC="<your 24 words>" FEED=XAUT/USD MIN_PRICE=0 npm run mint

# Mint with a price threshold (e.g. gold must be above $3000)
ACCESS_TOKEN=<your-token> CARDANO_MNEMONIC="<your 24 words>" FEED=XAU/USD MIN_PRICE=3000000 npm run mint
```

### Verified transactions on PreProd

| Type | Feed | Tx Hash |
|------|------|---------|
| Price verification | XAU/USD | [caaf9db7...](https://preprod.cardanoscan.io/transaction/caaf9db719e015031bf4b6164184b95226b433d4eb29c80a8a4960f02c309be0) |
| Price verification | XAU/USD | [8fca5fdd...](https://preprod.cardanoscan.io/transaction/8fca5fdd8e831c5e1ee0d8417cfedae480b6d2a7374647ded100b440fca49e43) |
| Price verification | XAUT/USD | [2d646b1f...](https://preprod.cardanoscan.io/transaction/2d646b1fdd24e864b2c70d0c6428a87931e51ef3029f5b70f5710e787ac14a10) |
| **Token mint** | XAUT/USD | [ae0a7393...](https://preprod.cardanoscan.io/transaction/ae0a7393616fddc31b27108213b177e33a211053ea4b423fd1a1bc27b66f23d9) |

## Project structure

```
lazer-rwa/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── feeds.ts                      — RWA feed catalog (configurable by symbol or ID)
│   ├── fetch_prices_lazer_rwa.ts     — Stream RWA prices from Pyth Lazer
│   ├── submit_tx_lazer_rwa.ts        — Submit price verification tx
│   └── mint_rwa_token.ts             — Mint LAZER-RWA token with price threshold check
└── onchain/
    ├── aiken.toml
    ├── plutus.json                    — Compiled Plutus V3 blueprint
    └── validators/
        └── lazer_rwa_threshold.ak     — Minting policy with Pyth price gate
```
