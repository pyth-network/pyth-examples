# Team Guards Pythathon Submission

## Details

Team Name: Guards
Submission Name: Guards One
Team Members: @f0x1777 @kevan1 @joaco05
Contact: @f0x1777

## Project Description

Guards is a multichain treasury protection workflow that uses Pyth price feeds to monitor liquid portfolio value, stable-denominated floors, and oracle-aware de-risking conditions. This submission focuses on the Cardano deployment surface.

This is the initial draft submission only. Source code, setup steps, and the full demo flow will be added incrementally in later updates to this draft PR.

## Testing & Verification

### How to Test This Contribution

The current implementation can be verified in three layers:

1. Static checks: typecheck and unit/integration tests
2. Local simulation: deterministic breach -> de-risk -> exit -> recovery flow
3. Live oracle wiring: fetch a real signed Pyth update for Cardano preprod

### Prerequisites

- Node.js `>= 24.0.0`
- `pnpm`
- A `.env` file based on `.env.example`
- A valid `PYTH_API_KEY`
- Cardano preprod configuration for live verification:
  - `PYTH_PREPROD_POLICY_ID`
  - `CARDANO_BLOCKFROST_PROJECT_ID`
  - `CARDANO_PYTH_STATE_REFERENCE`

### Setup & Run Instructions

```bash
pnpm install
cp .env.example .env
```

Fill the required environment variables, then run:

```bash
# Static validation
pnpm typecheck
pnpm test

# Deterministic treasury simulation
pnpm simulate

# Fetch a live signed Pyth update for the Cardano preprod flow
pnpm pyth:fetch-live

# Run the UI locally
pnpm --dir apps/ui dev
```

Local UI routes:

- Landing: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard`

### Deployment Information

Current deployment target for the hackathon is **Cardano preprod**.

Relevant deployment/runtime notes:

- Pyth preprod policy id:
  `d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6`
- Frontend can be deployed from `apps/ui`
- Off-chain oracle/keeper services require a Node 24 runtime plus the Cardano/Pyth environment variables listed above
- The multichain control-plane logic is shared, but this submission's live execution path is centered on Cardano preprod
