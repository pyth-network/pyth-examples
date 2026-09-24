# Cardano Custody Model for Automated Swaps

## Short answer

If funds remain under a classic multisig / simple-script control that requires multiple human signatures, the program cannot execute swaps without those signatures.

A bot can only move funds without a per-trade human approval if one of these is true:

1. the bot already controls enough signing authority to satisfy the spending rule, or
2. the funds are moved under a different spending rule that delegates bounded execution to the protocol.

For `guards.one`, the second model is the correct one.

## Recommended architecture

Split custody into two planes:

1. Governance / cold bucket
- Controlled by the treasury multisig.
- Used for funding, withdrawals, policy updates, and emergency recovery.
- Never used directly for automated swaps.

2. Execution / hot bucket
- Holds only the amount that can be automatically rebalanced.
- Controlled by a protocol execution rule rather than by the governance multisig itself.
- Used by the keeper to execute allowed swaps inside strict policy limits.

## Why this split is required

A Cardano multisig or simple script is a spending rule. If the rule says that `N` signatures are required, the transaction must include them. There is no oracle-aware exception that lets a bot bypass that rule.

So there are only three real choices:

1. Put bot-controlled signing keys inside the multisig threshold.
- This removes the need for human approval.
- It also weakens the trust model, because now automation holds direct signing power over the treasury.
- This is usually the wrong tradeoff for a DAO treasury.

2. Keep the treasury fully multisig and require human approval for every rebalance.
- Safe but not automated.
- This defeats the core value proposition of `guards.one`.

3. Keep governance in multisig, but move a bounded execution balance into an auto-executable bucket.
- This is the model we want.

## The `guards.one` execution model

### Control plane

`PolicyVault` is the policy authority.

It stores:
- approved routes
- source and destination assets
- max notional / max sell amount
- fee caps
- cooldowns
- stage machine
- keeper allowlist
- oracle requirements (`staleness`, `confidence`, reference input / witness rules)

Governance updates this plane through multisig-approved transactions.

### Asset plane

The treasury has two buckets:
- `cold/governance bucket`
- `execution hot bucket`

The cold bucket can refill or drain the hot bucket, but the hot bucket is the only bucket allowed to trade automatically.

### Execution flow

1. Governance configures the policy and funds the hot bucket.
2. The keeper observes market state off-chain.
3. The keeper fetches a signed Pyth update.
4. `Tx 1` authorizes execution:
- includes the Pyth state UTxO as reference input
- performs the `0` withdrawal to the Pyth verification script
- validates the trigger in `PolicyVault`
- anchors or records the execution intent, for example through tx metadata such as `reason_hash` and `tx_kind`; an explicit on-chain intent UTxO is a planned `Aiken` detail
5. `Tx 2` performs the swap from the hot bucket.
6. The result is anchored back into the policy / audit trail.

The key point is that governance approved the policy ahead of time, not the individual swap.

## Two implementation options

### Option A: bot-controlled hot wallet

The hot bucket is a wallet controlled by infrastructure operated by `guards.one`.

Pros:
- simplest to ship in a hackathon
- easiest to integrate with DEX / aggregator builders
- easiest to route through `DexHunter` or `Minswap`

Cons:
- weakest trust model
- the bot directly controls the execution wallet balance
- requires operational key management and tight balance limits

Use this for the MVP.

### Option B: contract-controlled hot bucket

The hot bucket sits under a Plutus / Aiken validator that only allows spends when:
- the intent exists,
- the route is approved,
- the fee policy is respected,
- the oracle witness is valid,
- the result stays within limits.

Pros:
- stronger trust minimization
- tighter on-chain enforcement

Cons:
- significantly more integration work
- more friction with real swap builders during the hackathon window

Use this after the MVP, or implement it incrementally for the parts that matter most.

## Practical recommendation for the hackathon

Use this exact model:

- governance treasury remains multisig
- only a capped hot bucket is automated
- `PolicyVault` authorizes swaps with oracle-aware checks
- the keeper executes swaps from the hot bucket
- emergency pause and refill remain under multisig control

This preserves the DAO narrative while still allowing real automation.

## Security rules that should not be optional

- hard cap the hot bucket notional
- enforce per-swap max sell amount
- enforce approved route ids only
- enforce destination asset allowlist
- enforce fee caps
- enforce cooldowns
- enforce kill switch / freeze
- log every authorization and execution event
- require multisig for policy updates and hot-bucket refills

## Operational truth

If someone says “the treasury is multisig and the bot can trade from the same funds without user approval,” then one of two things is true:
- the bot actually controls enough keys to satisfy the multisig, or
- the funds are no longer really governed by that multisig at execution time.

That distinction has to stay explicit in both docs and pitch.
