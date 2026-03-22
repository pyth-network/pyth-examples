# guards.one Cardano Aiken Scaffold

This directory is the bounded scaffold for the on-chain port of the current `PolicyVault` / hot-bucket model.

It mirrors the invariants currently enforced in TypeScript in [`packages/cardano/src/policy-vault.ts`](../../../../../packages/cardano/src/policy-vault.ts) and the custody model described in [`docs/cardano-custody-model.md`](../../../../../docs/cardano-custody-model.md).

## Scope

- Typed datum/redeemer skeletons for the vault state machine.
- Validator entrypoints that document the intended policy checks.
- No live deployment wiring yet.
- No Aiken tooling invocation in this workspace yet.

## What this scaffold captures

- governance signers and keeper allowlists
- approved route ids and asset allowlists
- cooldown and stage transitions
- Pyth witness presence in the authorize path
- bounded hot-bucket execution rather than direct multisig spending
- current-intent continuity plus bounded result settlement

## What is intentionally missing

- compiled scripts
- address derivation
- Plutus serialization details
- real on-chain Pyth verification
- live DEX/aggregator integration

## Files

- `lib/guards_one/types.ak`: datum, redeemer, and helper types.
- `lib/guards_one/policy_vault.ak`: scaffolded policy logic for the vault state machine.
- `validators/policy_vault.ak`: validator entrypoint wiring.
- `test/policy_vault.ak`: scenario catalog for the planned Aiken test suite.

## Next step

Finish the validator entrypoint wiring, then connect the generated script to the keeper flow once Aiken is available in CI.
