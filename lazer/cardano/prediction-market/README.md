# 5-Minute Prediction Market on Cardano

A decentralized prediction market on Cardano that uses **Pyth Lazer** oracle for real-time price feeds. Users create markets on any Pyth-supported asset (BTC, ETH, ADA, etc.), place bets through a constant-product AMM, and settle based on verified on-chain prices.

Includes a **market-maker bot** that continuously creates 1-minute markets and a **live frontend** with real-time Pyth price streaming and CIP-30 wallet integration for placing bets.

## Team Cliley

- **Clark Alesna** (Captain) — clark@saib.dev
- **Riley Kilgore** — riley.kilgore@iohk.io

## How Pyth Lazer Is Used

The contract integrates Pyth Lazer via the **withdraw-0 pattern** — the standard approach for consuming Pyth price data on Cardano:

1. **Market Creation** — The creator sets a target price and a Pyth feed ID (e.g., BTC/USD = 1). The Pyth deployment policy ID is stored in the on-chain datum.

2. **Market Resolution** — After the window closes, the bot resolves the market:
   - Fetches a signed price update from the Pyth Lazer REST API
   - Includes the signed message as a withdrawal redeemer in the transaction
   - On-chain, the validator calls `pyth.get_updates()` to extract the verified price
   - Compares `oracle_price > target_price` to determine the winning side

3. **Real-time Price Streaming** — The frontend uses `@pythnetwork/pyth-lazer-sdk` WebSocket streaming for live BTC price display (sub-second updates).

4. **Key Pyth Integration Points:**
   - `pyth-network/pyth-lazer-cardano` Aiken library (contract side)
   - Pyth Lazer REST API — `POST /v1/latest_price` (resolve transactions)
   - Pyth Lazer WebSocket — `wss://pyth-lazer-0.dourolabs.app/v1/stream` (live price feed)
   - Pyth State UTxO on Preprod: policy `d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6`

## Architecture

```
contracts/               Aiken smart contracts (Plutus V3)
├── lib/prediction_market/
│   ├── types.ak             MarketDatum, redeemers, params
│   └── market_validation.ak Bet, Resolve, Claim, Mint/Burn validation
├── validators/
│   ├── market.ak            Main validator (dual spend + mint)
│   ├── pyth_test.ak         Pyth integration test validator
│   └── tests/               Unit tests

offchain/                TypeScript (Bun + blaze-cardano)
├── lib/
│   ├── cardano.ts           Blaze setup, datum helpers, tx submission
│   ├── pyth.ts              Pyth HTTP API + WebSocket streaming
│   ├── market.ts            Market operations (create, resolve, bet, claim)
│   ├── bifrost.ts           CIP-30 wallet connector (Nami, Eternl, Lace)
│   └── types.ts             Shared types
├── cli.ts                   CLI for manual operations
├── bot.ts                   Market-maker bot (1-min cycles)
├── server.ts                Bun.serve() — API, WebSocket, frontend
├── index.html               Frontend shell
└── frontend.tsx             React app with live price + wallet + betting
```

## Contract Design

**One validator, dual purpose** — parameterized with a one-shot UTxO for unique policy IDs per market:

| Action | Description |
|--------|-------------|
| **Create** | Consume one-shot, mint state thread + YES/NO tokens, lock seed ADA |
| **Bet** | Constant-product AMM: `tokens = reserve - k / (other_reserve + amount)` |
| **Resolve** | Pyth Lazer price check, set `resolved=True` + `winning_side` |
| **Claim** | Burn winning tokens, receive proportional ADA payout |

## Verified on Preprod

Full end-to-end flow tested on Cardano Preprod:

| Step | Tx Hash |
|------|---------|
| Create (10 ADA seed, BTC/USD) | `9d840a1215456feea68708cab9088c84779b172f8106272d991e5fbdb78d05bd` |
| Bet YES (2 ADA) | `3c5d2bf0627693b47922124761e311f5f1e07e401385cc35e4a615b7204f4153` |
| Resolve (NO won via Pyth) | `88f97270e83503eba87f0bc6f677141100b06c5df216f73676937527e6bb131d` |
| Claim (12 ADA payout) | `7d691f3c2f52f0a48bd5378c7090560597c0e09fdf235883d455e2c9e9e04de5` |

## Quick Start

### Prerequisites

- [Aiken](https://aiken-lang.org/) v1.1+
- [Bun](https://bun.sh/) v1.0+
- Blockfrost API key (Preprod)
- Pyth Lazer API key

### Build Contracts

```bash
cd contracts
aiken build
aiken check  # run tests
```

### Run the Frontend + Bot

```bash
cd offchain
cp .env.example .env   # fill in your keys
bun install
bun --hot server.ts    # starts bot + frontend at http://localhost:3000
```

The bot automatically creates 1-minute BTC/USD markets, resolves them via Pyth, and loops. The frontend shows real-time prices and lets users bet via their browser wallet.

### CLI (Manual Operations)

```bash
bun cli.ts price BTC/USD
bun cli.ts create BTC/USD 10
bun cli.ts bet <policy> <oneshot_tx> <oneshot_idx> yes 2
bun cli.ts resolve <policy> <oneshot_tx> <oneshot_idx>
```

## Supported Feeds

Any Pyth Lazer feed ID works:

| Feed | ID |
|------|----|
| BTC/USD | 1 |
| ETH/USD | 2 |
| ADA/USD | 16 |

## License

MIT
