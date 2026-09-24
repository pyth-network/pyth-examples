# guards.one Functional Spec

## Summary
guards.one is a treasury policy enforcement system for Cardano with a multichain-native core. The MVP keeps Cardano live and uses Pyth as the oracle evidence layer for every automated execution. The product shifts from a simple mode toggle into a risk ladder that can perform partial de-risk, full stable exit, and oracle-aware auto re-entry.

## Product Goal
The system helps DAOs, communities, and treasury operators protect fiat-denominated value in volatile markets. It does not try to forecast markets or maximize yield. It enforces policy: if exposure becomes too large, too stale, or too uncertain, the treasury transitions into a safer state and optionally executes a swap into a single approved stable asset.

## Core Principles
- Oracle data is not decorative. Price, confidence, and freshness are inputs to execution.
- The business logic is chain-agnostic. Cardano is only the first live connector.
- Risk is measured both as percentage change and as liquid fiat value.
- The treasury should react to floors, not just drawdown.
- The system must remain explainable to a judge, a governance signer, and an auditor.

## Risk Model
The policy engine evaluates the treasury against three classes of thresholds.

### 1. Market drawdown
Compares the latest Pyth price against the EMA price (`ema_price` in the Pyth feed, `emaPrice` in the internal model) and computes a drawdown in bps. This is the first trigger for Watch and Partial DeRisk.

### 2. Liquid value floor
Computes the liquid value of each protected asset using:

`liquid_value = amount * pyth_price * (1 - haircut_bps/10000)`

If a protected asset or the full portfolio falls below a fiat/stable floor, the engine moves to Partial DeRisk or Full Stable Exit.

### 3. Oracle quality
If the update is stale or the confidence ratio is too wide, the treasury should stop trusting the market view and reduce exposure aggressively.

## Risk Ladder
The ladder is the main product abstraction.

1. `Normal`
The treasury is healthy. Governance can act and the keeper watches the oracle.

2. `Watch`
The treasury is approaching a threshold. No forced swap yet.

3. `Partial DeRisk`
The treasury sells part of the risky asset into the approved stable asset.

4. `Full Stable Exit`
The treasury fully exits the risky asset into the approved stable asset.

5. `Frozen`
If the oracle update is stale or the confidence ratio is too wide, automatic execution is blocked until the market view is trustworthy again.

6. `Auto Re-entry`
If the market recovers into the re-entry band and the cooldown has elapsed, the treasury can restore exposure.

## Swap Policy
The MVP uses one approved stable token and one preapproved route on Cardano. The execution flow is intentionally simple.

### Venue Strategy
- Primary integration target: `DexHunter`
- Fallback integration target: `Minswap Aggregator`

The venue choice is not only about best execution. It also affects the business model because `guards.one` intends to capture part of its revenue from automated protective swaps via integrator / partner fee infrastructure.

### Protocol fee policy

`guards.one` models revenue in two layers: venue partner fee plus protocol fee. The protocol fee is governance-capped, explicit, and accounted for separately from slippage and venue costs.


### Custody and authority model

The governance treasury remains multisig, but automated swaps run from a bounded execution bucket under a pre-approved policy. The system does not attempt to bypass a multisig spending rule; it moves a limited balance under an execution rule that the multisig approved ahead of time.

### Inputs
- Source asset
- Destination stable asset
- Route id
- Max sell amount
- Minimum buy amount
- Expiry
- Risk stage
- Reason hash

### Execution Behavior
- `Partial DeRisk` only sells enough to restore the safe floor or reduce exposure to the target band.
- `Full Stable Exit` sells the remaining risky exposure.
- Re-entry is oracle-aware and hysteresis-based. The system must not immediately re-open after a single recovered tick.

## On-chain Responsibilities
- Validate Pyth evidence in the same transaction.
- Verify freshness, confidence, and policy guards.
- Enforce the current stage of the vault.
- Emit or anchor an `ExecutionIntent`.
- Reject unauthorized signers, stale updates, or invalid routes.

## Off-chain Responsibilities
- Collect and cache oracle updates.
- Evaluate policies and compute breach events.
- Build the execution transaction.
- Route the swap through the approved execution wallet.
- Persist an auditable log of snapshots, intents, and outcomes.

## Multichain Model
The core code must not depend on Cardano-specific types. Instead, it exposes a common model that other chains can consume later.

### Shared abstractions
- `PolicyConfig`
- `OracleSnapshot`
- `RiskStage`
- `ExecutionIntent`
- `ExecutionResult`
- `TreasuryConnector`
- `RouteSpec`

### Current status
- Cardano: live MVP target.
- SVM: scaffolded from day one, no live deployment in this hackathon scope.
- EVM: scaffolded from day one, no live deployment in this hackathon scope.

## Non-goals
- Full perps engine
- Cross-chain vault migration
- Multi-DEX optimization
- Yield farming or portfolio maximization

## Acceptance Criteria
- A treasury can be created with a policy and roles.
- The dashboard can explain the latest oracle state and the current risk stage.
- A breach can trigger partial de-risk and full stable exit.
- A recovery condition can trigger auto re-entry.
- The product can explain how the same logic will later run on SVM and EVM.
