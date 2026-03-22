# Team Lazer Perps (ex Lazer RWA) — Pythathon Submission

## Details

Team Name: Lazer Perps
Submission Name: lazer-perps
Team Members: María Elisa Araya ([@ar3lisa](https://x.com/ar3lisa)), Bárbara Olivera ([@b4rbbb](https://x.com/b4rbbb))
Contact: https://x.com/ar3lisa / https://x.com/b4rbbb

> Direct extension of our [Lazer RWA](../lazer-rwa/) submission — same oracle integration, expanded into a perpetual futures protocol.

## Project Description

Perpetual futures protocol on Cardano. Traders open leveraged long/short positions on RWA assets using USDCx as collateral. Every action (open, close, liquidate) requires a fresh Pyth Lazer price witness in the transaction. No price → no trade.

All positions are independent eUTxOs. Each market is deployed with parameterized validators — no recompilation needed.

### How Pyth is used

`oracle_gate.ak` calls `pyth.get_updates(pyth_id, self)` from `pyth-network/pyth-lazer-cardano`. Every validator reads prices through this gate. Off-chain, `orchestrator.ts` fetches signed updates from Pyth Lazer and embeds them via the zero-withdrawal pattern.

### Markets

| Symbol | Asset | Feed ID | Max Leverage | Status |
|--------|-------|---------|--------------|--------|
| XAU/USD | Gold | 346 | 10x | stable |
| XAG/USD | Silver | 345 | 10x | stable |
| XAUT/USD | Tether Gold | 172 | 10x | stable (24/7) |
| XTI/USD | Oil (WTI) | 2950 | 5x | coming soon |

### Formulas (on-chain in `formulas.ak`)

**PnL:**
```
PnL = direction_multiplier × collateral × leverage × (exit_price - entry_price) / entry_price
  direction_multiplier: +1 Long, -1 Short
```

**Payout:**
```
Payout = max(0, collateral + PnL)
```

**Liquidation price:**
```
Long:  liq_price = entry_price × (1 - 1/leverage + 0.01)
Short: liq_price = entry_price × (1 + 1/leverage - 0.01)
```

**Liquidation trigger:**
```
Long:  current_price ≤ liq_price → liquidatable
Short: current_price ≥ liq_price → liquidatable
```

### Validators

| Validator | Purpose | Pyth Usage |
|-----------|---------|------------|
| `oracle_gate.ak` | Reads verified Pyth price | `pyth.get_updates()` |
| `open_position.ak` | Entry price + leverage + min collateral | Entry price must match oracle |
| `close_position.ak` | PnL settlement + owner signature | Exit price from oracle |
| `liquidate.ak` | Liquidation price check — anyone can trigger | Current price vs liq_price |
| `pool_manager.ak` | USDCx liquidity pool + open interest caps | — |

## Architecture

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
| Open position | XAUT/USD | [`96f8e76c...`](https://preprod.cardanoscan.io/transaction/96f8e76c00efdbb2e662a1ffc721cd09a02a330cefd2db90fcfcbbf0b7b854de) |
| Close position | XAUT/USD | [`4428816d...`](https://preprod.cardanoscan.io/transaction/4428816d106a67331077b7eb83ec54f97696000d1d5a8e2a059acc6c7418ff1e) |
| Liquidate | XAUT/USD | [`3b4e5590...`](https://preprod.cardanoscan.io/transaction/3b4e5590157cba456f130b69855f717fe62a8875ac7f02a394797aa32b3bff72) |

## How to run

### Prerequisites

- Node.js v24+
- [Aiken](https://aiken-lang.org) v1.1+
- Pyth Lazer access token
- Cardano PreProd wallet with tADA

### Setup

```bash
cd lazer/cardano/lazer-perps
npm install
cd onchain && aiken build && cd ..
```

### Commands

```bash
# Open a position
ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" FEED=XAUT/USD DIRECTION=long LEVERAGE=5 npm run open-position

# Close a position
ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" FEED=XAUT/USD npm run close-position

# Liquidate
ACCESS_TOKEN=<token> CARDANO_MNEMONIC="<24 words>" FEED=XAUT/USD npm run liquidate

# Keeper bot (monitors prices for liquidations)
ACCESS_TOKEN=<token> npm run keeper
```

## Roadmap

### Stage 1 — MVP (current)
- [x] Oracle gate with `pyth.get_updates()` on-chain
- [x] Open/close/liquidate validators with Pyth price witness
- [x] Pool manager with open interest caps
- [x] PnL and liquidation price formulas on-chain
- [x] Off-chain orchestrator with tx builders
- [x] Keeper bot with WebSocket price monitoring
- [x] USDCx collateral support (ADA on PreProd)
- [x] Verified transactions on PreProd (open, close, liquidate)
- [x] XAU/USD as primary market

### Stage 2 — Multi-market
- [ ] Deploy XAG/USD and XTI/USD markets
- [ ] Per-market leverage caps enforced on-chain
- [ ] Pool manager tracks OI per market
- [ ] Keeper auto-submits liquidation txs

### Stage 3 — Production
- [ ] Real USDCx collateral on mainnet (policy: `1f3aec8bfe7ea4fe14c5f121e2a92e301afe414147860d557cac7e34`)
- [ ] Reference scripts for reduced tx fees
- [ ] Funding rate mechanism
- [ ] Frontend UI

## Project structure

```
lazer-perps/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── feeds.ts               — Market catalog (symbol, feed ID, leverage cap)
│   ├── collateral.ts          — USDCx token config (policy ID + asset name)
│   ├── orchestrator.ts        — Central Pyth Lazer module + tx builders
│   ├── open_position.ts       — Open leveraged position
│   ├── close_position.ts      — Close position + PnL settlement
│   ├── liquidate.ts           — Liquidate undercollateralized position
│   └── keeper.ts              — WebSocket price monitor + liquidation detection
└── onchain/
    ├── aiken.toml
    ├── plutus.json             — Compiled Plutus V3 blueprint
    ├── lib/lazer_perps/
    │   ├── types.ak            — PositionDatum, MarketConfig, CollateralToken
    │   ├── oracle_gate.ak      — pyth.get_updates() price reader
    │   └── formulas.ak         — PnL, payout, liquidation price
    └── validators/
        ├── open_position.ak    — Entry price + leverage + collateral check
        ├── close_position.ak   — PnL settlement with owner signature
        ├── liquidate.ak        — Liquidation price trigger (anyone can call)
        └── pool_manager.ak     — USDCx liquidity pool + OI management
```
