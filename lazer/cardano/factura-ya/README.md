# Team Facturas Ya Pythathon Submission

## Details

Team Name: Facturas Ya
Submission Name: Factura Ya
Team Members: Dario Fasolino, Macarena Carabajal
Contact: dario.a.fasolino@gmail.com, macacarabajal3@gmail.com

## Project Description

**Factura Ya** is an on-chain invoice factoring marketplace built on Cardano. It lets Latin American SMEs tokenize their outstanding invoices as NFTs and sell them at a discount to investors, providing immediate liquidity without banks or traditional factoring intermediaries.

### The Problem

SMEs in Argentina wait 60-90 days to collect on invoices. Traditional factoring charges 3-5% monthly with slow approvals. Meanwhile, $24B+ in tokenized real-world assets (RWAs) exist on-chain, but none serve LATAM SMEs.

### How It Works

1. **SME registers an invoice** — amount (ARS), due date, debtor info
2. **Invoice is tokenized** as an NFT on Cardano, with collateral locked in escrow (10-20%)
3. **Listed on the marketplace** with a discount and due date
4. **Investor purchases** — pays ADA, SME receives funds instantly
5. **At maturity** — investor confirms payment received (collateral returned to SME) or reports non-payment (collateral transferred to investor)

### How We Use Pyth

Pyth is **central** to the invoice valuation pipeline:

- **On-chain**: The `pyth_oracle.ak` module calls `pyth.get_updates()` to read the verified ADA/USD price feed (feed ID 16) from the Pyth withdraw-script redeemer. Price freshness is validated (max 60 seconds).
- **Conversion**: `usd_to_lovelace()` converts invoice values from USD to ADA using the real-time Pyth price, enabling accurate marketplace pricing.
- **Listing**: When an invoice is listed, the current Pyth price is snapshotted into the listing datum as a reference.
- **Off-chain**: `PythPriceClient` subscribes to Pyth Pro WebSocket for live price updates, feeding them into transaction construction via the official `@pythnetwork/pyth-lazer-cardano-js` SDK.

**PreProd Policy ID**: `d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6`

> **Note on currency**: Invoices are denominated in USD (not ARS) because Pyth's ADA/USD feed (ID 16) is live, while the ARS/USD feed (ID 2582) is "coming soon". This lets us demonstrate real oracle integration today. Switching to ARS requires only adding a second oracle call when the feed goes live. See [currency-decision.md](custom_docs/currency-decision.md) for details.

## Architecture

```
Frontend (React) ←→ Indexer API (Express)
       ↓                    ↑
Off-chain Tx Builders    Oura Pipeline
  (TypeScript)              ↑
       ↓               Cardano PreProd
┌──────────────────────────────────┐
│       Smart Contracts (Aiken)     │
│                                   │
│  invoice_mint.ak  - NFT minting  │
│  escrow.ak        - collateral   │
│  marketplace.ak   - list/buy     │
│  pyth_oracle.ak   - price feed   │
│                                   │
│       Pyth Oracle (ADA/USD)       │
│    (withdraw-script pattern)      │
└──────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart Contracts | Aiken (Plutus V3) |
| Oracle | Pyth Pro (feed 16: ADA/USD) |
| On-chain SDK | pyth-network/pyth-lazer-cardano |
| Off-chain SDK | @pythnetwork/pyth-lazer-cardano-js |
| Tx Builder | Evolution SDK |
| Indexer | Oura (TxPipe) + Express |
| Frontend | React + Vite + TypeScript |
| Network | Cardano PreProd |

## Project Structure

```
factura_ya/
├── contracts/           # Aiken smart contracts
│   ├── lib/
│   │   ├── pyth_oracle.ak   # Pyth price feed consumer
│   │   ├── types.ak          # Shared types
│   │   ├── pyth.ak           # Vendored Pyth library
│   │   ├── pyth/message.ak   # Pyth message verification
│   │   ├── parser.ak         # Binary parser
│   │   └── types/             # Integer types (u8..u64, i16, i64)
│   └── validators/
│       ├── invoice_mint.ak    # Invoice NFT minting policy
│       ├── escrow.ak          # Collateral lock/release/forfeit
│       └── marketplace.ak     # List/purchase/delist
├── offchain/             # TypeScript tx builders
│   └── src/
│       ├── pyth.ts            # Pyth WebSocket client
│       ├── mint.ts            # Mint/burn invoice NFTs
│       ├── escrow.ts          # Collateral operations
│       └── marketplace.ts     # List/purchase/delist
├── indexer/              # Oura-powered marketplace indexer
│   ├── oura.toml              # Pipeline config
│   └── src/api.ts             # REST API
├── frontend/             # React web UI
│   └── src/
│       ├── App.tsx
│       └── components/        # Marketplace, RegisterInvoice, PriceDisplay
└── custom_docs/          # Design docs (PRD, spec, Pyth research)
```

## Setup & Run

### Prerequisites

- [Aiken](https://aiken-lang.org/) v1.1.21+
- Node.js 20+ (required by Lucid Evolution)
- Pyth API key (from hackathon organizers)

### Quick Start

```bash
# Install everything (contracts + offchain + frontend + indexer)
npm run install:all

# Build & test smart contracts (32 tests)
npm run contracts:build
npm run contracts:test

# Start services (run each in a separate terminal)
npm run server      # tx server on :3002 — builds, signs, submits txs
npm run frontend    # React UI on :5173
npm run indexer     # optional: Oura API on :3001
```

### Individual Commands

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install deps for all sub-projects |
| `npm run contracts:build` | Compile Aiken smart contracts |
| `npm run contracts:test` | Run 32 Aiken unit tests |
| `npm run server` | Start tx server (port 3002) |
| `npm run frontend` | Start React frontend (port 5173) |
| `npm run indexer` | Start Oura indexer API (port 3001) |
| `npm run test-mint` | Mint a test NFT (needs `WALLET_ADDRESS` env) |

## Architecture Decision: Transaction Server

### Problem

Cardano transaction construction requires [Lucid Evolution](https://github.com/Anastasia-Labs/lucid-evolution), which depends on `libsodium-wrappers-sumo` (WASM cryptography). This library has a known ESM packaging bug: its ESM entry (`modules-sumo-esm/libsodium-wrappers.mjs`) imports `./libsodium-sumo.mjs`, but that file ships in a separate package (`libsodium-sumo`) and isn't resolvable via the relative import.

### What We Tried

| Approach | Result |
|----------|--------|
| Lucid in Vite with `vite-plugin-wasm` + `top-level-await` | `libsodium-sumo.mjs` import fails |
| Vite `resolve.alias` to CJS build | Vite package export resolver blocks subpath |
| Include Lucid in `optimizeDeps` | `lodash` CJS/ESM mismatch, `safe-buffer` crash |
| Load Lucid from CDN (`unpkg`) | No ESM build published for `@lucid-evolution/lucid` |
| Bundle with `esbuild` for browser | WASM imports + `libsodium` + Node builtins all fail |
| Node 18 → Node 20 upgrade | `libsodium` ESM bug persists across Node versions |

### Current Solution

Transaction construction runs on a **Node.js server** (`offchain/src/deploy-server.ts`, port 3002) where Lucid works natively. The frontend opens standalone HTML pages served by this server for wallet interaction (CIP-30 signing). The server and frontend communicate via a `/status` REST endpoint.

### Path to Production

- **Short term**: Replace Lucid with [MeshJS](https://meshjs.dev/), which is browser-native and avoids the `libsodium` dependency entirely.
- **Medium term**: Wait for Lucid Evolution to fix their ESM/WASM packaging ([related issue](https://github.com/nicholasgasior/npm-libsodium-sumo/issues)).
- **Alternative**: Backend-signs architecture where a custodial server key constructs and signs transactions, and the user only confirms intent.

## License

Apache-2.0
