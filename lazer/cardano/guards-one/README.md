# Team SOLx-AR Pythathon Submission

## Details

Team Name: SOLx-AR
Submission Name: guards.one
Team Members: TODO before final submission
Contact: TODO before final submission

## Project Description

guards.one is an oracle-aware treasury control plane for Cardano treasuries with a multichain-native policy engine. It turns treasury risk rules into bounded execution intents and operator-visible actions.

### What does this project do?

- monitors treasury liquid value, stable ratio, drawdown versus EMA, oracle freshness, and confidence
- escalates through a risk ladder: `normal -> watch -> partial de-risk -> full stable exit -> auto re-entry`
- simulates the Cardano two-step execution flow: authorize intent first, execute the approved stable swap second
- ships a replayable operator UI inspired by treasury / multisig desks so judges can see the full breach lifecycle quickly

### How does it integrate with Pyth?

- uses Pyth price feeds as the primary market data source for `ADA/USD` and the stable reserve reference
- evaluates `price`, `emaPrice`, oracle freshness, and confidence inside the shared risk engine
- models the Cardano preprod witness flow with the provided `PYTH_PREPROD_POLICY_ID` and signed update envelope in the control-plane simulator
- keeps the codebase ready for the real off-chain Pyth Cardano SDK integration in the next implementation step

### What problem does it solve?

DAOs and on-chain treasuries do not fail only because an asset moves `X%`; they fail when protected fiat value drops below the floor they intended to defend. guards.one automates that defense with transparent oracle-aware rules instead of ad hoc human reactions.

## Repository Structure

```text
lazer/cardano/guards-one/
├── README.md                # Hackathon submission README
└── source/
    ├── apps/                # Backend demo server and operator UI
    ├── docs/                # Functional spec, roadmap, frontend spec
    ├── packages/            # Core engine, Cardano adapter, SVM/EVM scaffolds
    ├── package.json
    ├── pnpm-lock.yaml
    ├── pnpm-workspace.yaml
    ├── tsconfig.json
    └── .env.example
```

## How to Test

### Prerequisites

- Node.js 22+
- pnpm 10+

### Setup & Run Instructions

```bash
cd lazer/cardano/guards-one/source
pnpm install
pnpm typecheck
pnpm test
pnpm simulate
pnpm export:ui-data
pnpm preview
```

Then open `http://localhost:4310` and use the `Replay breach` action in the UI.

## Deployment Information

Network: Cardano preprod (simulated control-plane path in this submission)
Contract Address(es): N/A in this snapshot; the current repo still uses the Cardano policy-vault simulator/spec
Demo URL: local preview via `pnpm preview`

## Notes for Reviewers

- The current submission includes the working core engine, backend simulation, multichain scaffolding, and replayable operator UI.
- The next technical step after the hackathon is porting the Cardano control-plane simulator to `Aiken` and wiring real Pyth signed updates on preprod.
- Replace the `TODO` team/contact fields before final submission.
