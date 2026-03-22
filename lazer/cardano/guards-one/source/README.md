# guards.one

guards.one is an oracle-aware treasury policy enforcement MVP for Cardano with a multichain-native core. This documentation bootstrap describes the target architecture and the implementation plan that lands in the follow-up PR stack.

Built for the Buenos Aires Pythathon, the project treats Pyth as a core system dependency, not a cosmetic data source: risk state changes, execution authorization, and auditability all depend on oracle evidence. Public branding is `guards.one`; the internal package/tooling namespace remains `anaconda`.

## Product thesis
guards.one is not a dashboard that happens to read oracle data. It is a treasury control plane that turns risk rules into executable actions.

The core loop is:
1. ingest Pyth snapshots,
2. evaluate treasury health using drawdown, fiat floors, freshness, and confidence,
3. authorize a bounded execution intent,
4. execute the approved route from the hot bucket,
5. anchor an audit trail with intent, result, and oracle evidence.

For the MVP, `Cardano` is the live execution target and the risk logic is intentionally portable so future `SVM` and `EVM` connectors can consume the same business model without a refactor.

## Why this matters
- DAOs and on-chain treasuries often define treasury mandates in percentages, but the real failure mode is breaching an absolute protection floor in fiat or stable terms.
- Oracle-driven automation should not only track spot price; it must also reason about stale data, confidence widening, and recovery hysteresis.
- guards.one converts those constraints into a bounded two-step execution model: authorize based on oracle evidence, then execute only an approved route from a capped hot wallet.

## Implemented MVP scope
The current repository already includes:
- a shared core policy engine with liquid-value based triggers using `price`, `emaPrice`, `confidence`, freshness, and fiat floors
- a Cardano control-plane simulator and later an `Aiken` port
- backend services for collector, keeper, risk engine, audit logging, and end-to-end simulation
- a Squads-inspired operator UI shell for the treasury demo
- `SVM` and `EVM` scaffolding packages so the core remains multichain-native from day one

## Why Pyth is required
- The policy engine evaluates both `price` and `emaPrice`.
- Automatic execution is blocked when the oracle snapshot is stale.
- Confidence widening is treated as a first-class risk signal, not just an informational metric.
- Every execution path is designed around carrying oracle evidence into the control plane so the decision can be audited later.

## Canonical risk ladder
Display names and code identifiers will stay aligned across docs and implementation:
- `Normal` (`normal`): no policy breach, treasury operates normally
- `Watch` (`watch`): early warning, no forced swap yet
- `Partial DeRisk` (`partial_derisk`): sell just enough risky exposure to rebuild the protected stable floor / target ratio
- `Full Stable Exit` (`full_exit`): move the remaining risky bucket into the approved stable asset
- `Frozen` (`frozen`): stale or low-quality oracle conditions block automatic execution
- `Auto Re-entry`: recovery path that becomes available only after hysteresis and cooldown

The engine measures both percentage risk and absolute protected value:

`liquid_value = amount * pyth_price * (1 - haircut_bps / 10000)`

That means the trigger is not just “asset dropped X%”, but also “the treasury or a protected asset fell below the fiat floor we promised to defend”.

## Target architecture
### Shared core
- `PolicyConfig`
- `OracleSnapshot`
- `RiskStage`
- `ExecutionIntent`
- `ExecutionResult`
- `RouteSpec`
- `TreasuryConnector`

### Cardano MVP path
- `Tx 1`: authorize execution with oracle-aware validation and an emitted `ExecutionIntent`
- `Tx 2`: execute the approved swap from the execution hot bucket and anchor the result

### Multichain stance
- `Cardano`: live path in the MVP
- `SVM`: scaffold package with capability matrix and route simulation
- `EVM`: scaffold package with capability matrix and route simulation

The business logic is shared; execution remains local to each connected treasury chain.

## Intended demo flow
1. A treasury is configured with a protected asset, approved stable, floor thresholds, guardrails, and route policy.
2. The collector ingests an oracle snapshot and the risk engine evaluates treasury state.
3. If a breach is detected, the Cardano control plane authorizes a bounded `ExecutionIntent`.
4. The keeper executes a swap from the hot bucket using the approved route and anchors the result.
5. Once the market recovers beyond the re-entry threshold and cooldown, the system can auto re-enter.

The current simulation and UI replay cover this full sequence:
- `partial_derisk`
- `full_exit`
- `auto re-entry`

The frontend now exposes that run as a deterministic operator demo:
- a workspace card and treasury shell inspired by premium multisig / treasury desks
- account tables for the hot risk bucket and stable reserve
- a replayable timeline for `watch -> partial de-risk -> full stable exit -> recovery`
- a chart built from the simulated backend series
- audit cards rendered from the backend event log

## Planned repo layout
The follow-up PR stack introduces:
- `packages/core`: shared types, formulas, policy engine, fixtures, tests
- `packages/cardano`: Cardano control-plane simulator and execution connector
- `packages/svm`: scaffold connector and tests
- `packages/evm`: scaffold connector and tests
- `apps/backend`: collector, keeper, audit store, simulation, e2e tests
- `apps/ui`: static landing and dashboard shell
- `docs`: functional spec, roadmap, landing/frontend spec

## Development workflow
The repository is intentionally organized as a monorepo because the core risk model must stay chain-agnostic while adapters evolve independently.

Suggested review order:
1. `docs/` for product scope and UX intent
2. `packages/core` for the business model and policy engine
3. `packages/cardano` for the Cardano control-plane simulator
4. `apps/backend` for orchestration, persistence, and e2e flow
5. `apps/ui` for the operator-facing shell

## Planned scripts
These commands land in the follow-up code PRs:
- `pnpm test`: run the full test suite
- `pnpm typecheck`: run TypeScript type checks
- `pnpm simulate`: execute the end-to-end backend simulation
- `pnpm export:ui-data`: generate the backend demo payload for the static UI
- `pnpm preview`: serve `apps/ui` plus `/api/demo-state` locally

## Quick start (once the code PRs land)
```bash
pnpm install
pnpm typecheck
pnpm test
pnpm simulate
pnpm export:ui-data
pnpm preview
```

Open `http://localhost:4310` after `pnpm preview` to inspect the static frontend using a backend-generated demo payload.

## Current repo status
- The docs, core engine, backend simulation, UI shell, and multichain scaffolding are merged in `main`.
- The living execution tracker is maintained in `NEXT_STEPS.md`.
- The next engineering steps are the real `Aiken` port, real Pyth witness flow, and a live Cardano swap venue.

## Constraints and non-goals
- Cardano is the only live execution target in this MVP.
- `SVM` and `EVM` are scaffolded from day one so the business logic does not need a future refactor.
- Hedge/perps are intentionally left in the roadmap, not in the live MVP.
- The Cardano validator path is modeled as a TypeScript simulator/spec in this repo; a compiled `Aiken` validator is the next implementation step.

## Documentation
- [Functional spec](./docs/functional-v4.md)
- [Roadmap](./docs/roadmap.md)
- [Landing / frontend spec](./docs/landing-frontend-spec.md)
- [Execution tracker](./NEXT_STEPS.md)

## Environment
- Root `.env` is used for local backend scripts and deploy preparation.
- `.env` is gitignored and already seeded locally with the provided Pyth API key and preprod policy id.
- `.env.example` is safe to commit and documents the variables needed for Pyth, Cardano preprod, wallets, provider, and audit storage.

## Next implementation steps
1. Port the Cardano policy-vault simulator to an `Aiken` validator and wire the real Pyth witness flow.
2. Replace the simulated execution connector with a real Cardano route builder and settlement path.
3. Capture final screenshots / recording from the local replay demo for the pitch and `pyth-examples` submission.
