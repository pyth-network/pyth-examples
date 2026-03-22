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
- **Conversion**: `usd_to_lovelace()` converts invoice values from ARS/USD to ADA using the real-time Pyth price, enabling accurate marketplace pricing.
- **Listing**: When an invoice is listed, the current Pyth price is snapshotted into the listing datum as a reference.
- **Off-chain**: `PythPriceClient` subscribes to Pyth Pro WebSocket for live price updates, feeding them into transaction construction via the official `@pythnetwork/pyth-lazer-cardano-js` SDK.

**PreProd Policy ID**: `d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6`

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
- Node.js 18+
- Pyth API key (from hackathon organizers)

### Build Contracts

```bash
cd contracts
aiken build
aiken check  # runs 25 tests
```

### Run Indexer

```bash
cd indexer
npm install
npm start  # starts on port 3001
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev  # starts on port 5173, proxies /api to indexer
```

## License

Apache-2.0
