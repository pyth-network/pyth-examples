# DevalGuard — Automatic Devaluation Insurance

## Details

**Team Name:** DevalGuard
**Submission Name:** DevalGuard
**Team Members:** Quimey Marquez
**Contact:** quimey.marquez@gmail.com

## Quick Start for Judges

**Demo mode (no wallet needed, 30 seconds):**
```bash
cd frontend && npm install && npm run dev
# Open http://localhost:15177 → click "Demo Mode"
```

**Smart contracts (29 tests):**
```bash
aiken build && aiken check
```

**On-chain with real wallet (5 minutes):**
1. Install [Eternl](https://eternl.io), switch to **PreProd** testnet
2. Get tADA from [Cardano Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/)
3. Set collateral: Eternl > Settings > Collateral > Confirm
4. `cd frontend && cp .env.example .env && npm install && npm run dev`
5. Open http://localhost:15177 → Connect Wallet → Initialize Pool → Subscribe

---

## Project Description

DevalGuard is an on-chain parametric insurance protocol on Cardano that automatically compensates users if a fiat currency (e.g., the Argentine peso) devalues beyond a chosen threshold. Users pay a small premium and select their coverage parameters. If the exchange rate crosses the threshold during the coverage period, the smart contract reads the price from Pyth and executes the payout automatically — no claims process, no paperwork.

**No DeFi product on any blockchain offers parametric devaluation insurance today. DevalGuard is the first.**

### The Problem

In Argentina and across LATAM, currency devaluation is a chronic reality. 1 in 3 Argentines already uses crypto to hedge, and 60%+ of crypto activity involves stablecoins. But the only available strategy is to manually convert all savings to dollars — there's no "insurance-like" mechanism where you pay a small premium and get automatic coverage.

### How It Works

1. **Subscribe:** Choose a devaluation threshold (5%, 10%, 15%, 20%) and coverage period (7, 14, or 30 days). Pay a premium in ADA.
2. **Monitor:** The smart contract records the current exchange rate as your strike price via Pyth.
3. **Automatic Payout:** If the currency devalues past your threshold, anyone can trigger the claim. The contract reads the current price from Pyth, verifies the devaluation, and sends the payout directly to your wallet.
4. **Expiry:** If no devaluation event occurs, the policy expires and the premium goes to liquidity providers as yield.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│  - Subscribe to policy    - LP deposit/withdraw      │
│  - View active policies   - Trigger claim check      │
└─────────────┬───────────────────────┬───────────────┘
              │                       │
┌─────────────▼───────────────────────▼───────────────┐
│              Off-chain Tx Builders (TypeScript)       │
│  - buildSubscribeTx   - buildClaimTx                 │
│  - buildDepositTx     - buildWithdrawTx              │
└─────────────┬───────────────────────┬───────────────┘
              │                       │
┌─────────────▼──────┐  ┌────────────▼────────────────┐
│  Policy Validator   │  │   Liquidity Pool Validator   │
│  (Aiken)            │  │   (Aiken)                    │
│  - Subscribe        │  │   - Deposit / Withdraw       │
│  - Claim            │  │   - Reserve accounting       │
│  - Expire           │  │                              │
└─────────┬──────────┘  └────────────┬────────────────┘
          │                          │
          │    ┌─────────────────┐   │
          └───►│  Pyth Oracle    │◄──┘
               │  (ARS/USD feed) │
               └─────────────────┘
```

## How Pyth Is Used

**Pyth is the heart of DevalGuard.** The entire protocol depends on Pyth's price feed:

1. **On-chain verification:** The Aiken smart contracts consume Pyth price data via the **withdraw-script verification pattern** (Pyth Pro / Lazer on Cardano). Each transaction includes a signed price update as a withdraw redeemer, verified against Pyth's trusted signers.

2. **Strike price at subscription:** When a user buys coverage, the contract reads the current price from Pyth and stores it as the strike price.

3. **Claim verification:** When a claim is triggered, the contract reads the current price from Pyth and compares it to the strike price. If the devaluation exceeds the threshold, the payout executes automatically.

4. **Freshness validation:** The oracle helper enforces a 60-second maximum age on price updates to prevent stale data attacks.

### Pyth Integration Details

- **Aiken library:** `pyth-network/pyth-lazer-cardano` (on-chain)
- **Off-chain SDK:** `@pythnetwork/pyth-lazer-cardano-js`
- **PreProd Policy ID:** `d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6`
- **Feed:** ADA/USD (feed #16) for the MVP demo. The protocol is feed-agnostic — switching to USD/ARS (feed #2582) or any stablecoin pair is a one-line config change when the feed goes live on Pyth
- **Pattern:** Withdraw-script verification (Plutus V3 staking validator)

### Why ADA/USD for the Demo?

The production vision for DevalGuard is to insure against **fiat currency devaluation** (ARS/USD, BRL/USD, etc.) with premiums and payouts in **stablecoins** (USDC, DJED). However, Pyth's USD/ARS feed (#2582) is not yet live on Cardano. Rather than faking the data, we use **ADA/USD** — a real, live Pyth feed — to demonstrate the full protocol end-to-end. The on-chain logic is **100% feed-agnostic**: switching to any currency pair is a single config change (`feed_id` in `ProtocolConfig`). The insurance math (basis-point thresholds, strike price comparison, reserve accounting) works identically regardless of which asset is being tracked.

## Project Structure

```
deval_guard/
├── validators/
│   ├── liquidity_pool.ak    # Pool validator (deposit, withdraw, reserves)
│   └── policy.ak            # Insurance policy validator (subscribe, claim, expire)
├── lib/
│   ├── types.ak             # Shared types (PolicyDatum, PoolDatum, ProtocolConfig)
│   ├── pyth_oracle.ak       # Pyth price extraction + devaluation check
│   ├── pool_tests.ak        # Pool validator unit tests (11 tests)
│   └── policy_tests.ak      # Policy validator unit tests (11 tests)
├── offchain/
│   └── src/
│       ├── pyth.ts           # Pyth SDK integration (price fetching, tx helpers)
│       ├── pool.ts           # Pool transaction builders
│       └── policy.ts         # Policy transaction builders
├── frontend/
│   └── src/
│       ├── App.tsx           # Main application
│       └── components/       # Subscribe, Policies, Pool, PriceDisplay, WalletConnect
├── aiken.toml                # Aiken project config
└── README.md                 # This file
```

## Prerequisites

- [Aiken](https://aiken-lang.org) v1.1.21+
- Node.js 18+

### For on-chain testing (optional)

1. Install [Eternl](https://eternl.io) browser extension
2. Create a wallet and switch to **PreProd** testnet (Settings > Network)
3. Get tADA from the [Cardano Faucet](https://docs.cardano.org/cardano-testnets/tools/faucet/) (paste your receive address)
4. Set collateral in Eternl: **Settings > Collateral > Confirm** (locks 5 ADA for script execution fees)

> No wallet needed for demo mode — click "Demo Mode" to try the full flow with simulated data.

## Setup & Run

### Smart Contracts

```bash
# Build contracts
aiken build

# Run tests (29 tests)
aiken check
```

### Frontend (with real wallet)

```bash
cd frontend
cp .env.example .env    # edit if needed
npm install
npm run dev
# Open http://localhost:5177
```

Then:
1. Click **Connect Wallet** → authorize in Eternl/Nami
2. Click **Initialize Pool** (first time only, deposits 50 tADA)
3. **Add Liquidity** to the pool if needed
4. **Subscribe** to a policy (pick threshold, period, premium)
5. Policies appear on-chain with CardanoScan links

### Frontend (demo mode, no wallet needed)

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5177
```

Click **Demo Mode** → simulated pool, manual price slider to demonstrate the full insurance flow without any blockchain interaction.

### Off-chain SDK

```bash
cd offchain
npm install
npm run build
```

## Demo

The frontend includes a **price simulation slider** that lets you manually adjust the ARS/USD exchange rate to demonstrate the full insurance lifecycle:

1. Connect wallet
2. Subscribe to a policy (e.g., 10% threshold, 5 ADA premium)
3. See confirmation: _"If ARS devalues 10%, you receive 50 ADA"_
4. Slide the price up to simulate devaluation
5. When devaluation crosses the threshold, the claim button appears
6. Click claim — payout is sent to your wallet

## Test Results

```
29 tests | 29 passed | 0 failed

pyth_oracle:   7 tests (devaluation checks, large numbers, edge cases)
pool_tests:   11 tests (deposit, withdraw, reserve accounting, full lifecycle)
policy_tests: 11 tests (subscribe, claim, expire, full lifecycle flows)
```

## Market Context

- 1 in 3 Argentines uses crypto to hedge devaluation (Chainalysis 2025)
- 60%+ of crypto activity in Argentina involves stablecoins
- No DeFi product on any blockchain offers parametric devaluation insurance
- Parametric insurance exists for hacks (Nexus Mutual) and depegs (Etherisc), but not for fiat FX
