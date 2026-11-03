# Team LANTR – Pythathon Submission

## Details

- **Team Name:** LANTR
- **Submission Name:** Pythacoin – CDP-based stablecoin on Cardano using Pyth Lazer
- **Team Members:** Captain Alex Nemish (@nau)
- **Contact:** alex@lantr.io

## Demo

https://youtu.be/RK7WsZQiG54

## Project Description

Pythacoin is a fully functional CDP (Collateralized Debt Position) stablecoin protocol on Cardano
that uses Pyth Lazer price feeds for real-time ADA/USD pricing.

Users lock ADA as collateral to mint PUSD, a synthetic USD-pegged stablecoin. The protocol enforces
a 95% max LTV for minting and a 90% liquidation threshold — when a CDP becomes undercollateralized,
anyone can liquidate it by repaying the debt and claiming the collateral.

### How it uses Pyth

- **On-chain:** The Plutus V3 validator reads ADA/USD prices directly from Pyth Lazer withdrawal
  redeemers. It locates the Pyth State UTxO in reference inputs, extracts the withdraw script hash,
  then parses the binary price payload (feed ID 16, ADA/USD) from the corresponding withdrawal
  redeemer. This is a full on-chain Pyth Lazer integration in Scalus (Scala-to-Plutus compiler) — no
  Aiken dependency.
- **Off-chain:** The backend fetches signed price updates via the Pyth Lazer REST API (`solana`
  format) and includes them as withdrawal redeemers in every price-dependent transaction (open,
  borrow, liquidate).

### Features

- **Open CDP** — lock ADA, optionally borrow PUSD
- **Borrow** — mint additional PUSD against existing collateral
- **Repay** — burn PUSD to reduce debt
- **Close** — repay all debt, reclaim collateral
- **Liquidate** — anyone can liquidate CDPs above 90% LTV
- **Live price feed** — real-time ADA/USD from Pyth Lazer (feed ID 16)
- **Web frontend** — React app with CIP-30 wallet integration (Nami, Eternl, Lace)

### Tech Stack

- **Smart contract:** Scala 3 + [Scalus](https://scalus.org) (Plutus V3, combined mint+spend
  validator)
- **Backend:** Scala 3, Tapir REST API, Scalus transaction builder
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Oracle:** Pyth Lazer (ADA/USD feed ID 16, preprod policy
  `d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6`)
- **Network:** Cardano PreProd

### Source Code

- `src/main/scala/pythacoin/onchain/CdpValidator.scala` — on-chain validator with Pyth integration
- `src/main/scala/pythacoin/Server.scala` — REST API and transaction building
- `src/test/scala/pythacoin/CdpValidatorTest.scala` — unit tests (11 passing)
- `frontend/` — React frontend

### Running

```bash
# If you have Nix, just run `nix develop` to get all dependencies

# Backend (requires BLOCKFROST_API_KEY and PYTH_KEY in .env)
sbt "runMain pythacoin.main start"

# Tests
sbtn test

# Frontend
cd frontend && npm install && npm run dev
```
