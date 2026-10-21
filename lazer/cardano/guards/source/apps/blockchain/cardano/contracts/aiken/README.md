# guards.one Cardano Aiken Scaffold

This directory is the bounded scaffold for the on-chain port of the current `PolicyVault` / hot-bucket model.

It mirrors the invariants currently enforced in TypeScript in [`packages/cardano/src/policy-vault.ts`](../../../../../packages/cardano/src/policy-vault.ts) and the custody model described in [`docs/cardano-custody-model.md`](../../../../../docs/cardano-custody-model.md).

## Scope

- Typed datum/redeemer skeletons for the vault state machine.
- Governance emergency recovery wired in the validator.
- `AuthorizeExecution` and `CompleteExecution` modeled in the helper layer but kept fail-closed in the spend validator until custody-safe continuity checks are implemented.
- Preprod-oriented shell scripts for toolchain checks, blueprint build, script export, script hash, and address derivation.
- Aiken tooling is not vendored or installed by default; build scripts assume `aiken` is available on `PATH`.

## What this scaffold captures

- governance signers and keeper allowlists
- approved route ids and asset allowlists
- cooldown and stage transitions
- pure helper checks for Pyth witness shape in the authorize path
- bounded hot-bucket execution rather than direct multisig spending
- current-intent continuity plus bounded result settlement
- keeper signature checks via `extra_signatories`
- governance-controlled emergency withdraw path

## What is intentionally missing

- real on-chain Pyth payload verification
- recreated-output continuity checks for `UpdatePolicy` / `Resume`
- live DEX/aggregator integration

## Files

- `lib/guards_one/types.ak`: datum, redeemer, and helper types.
- `lib/guards_one/policy_vault.ak`: scaffolded policy logic for the vault state machine.
- `validators/policy_vault.ak`: validator entrypoint wiring.
- `test/policy_vault.ak`: scenario catalog for the planned Aiken test suite.
- `scripts/doctor.sh`: checks required toolchain and env for preprod work.
- `scripts/build.sh`: runs `aiken build`, exports `policy_vault.plutus`, and writes the script hash.
- `scripts/derive-address.sh`: derives the script address and script hash directly from the Aiken blueprint.

## Deploy-prep workflow

```sh
pnpm cardano:contract:doctor
pnpm cardano:contract:build
pnpm cardano:contract:address
```

Notes:

- `pnpm cardano:contract:build` requires `aiken` on `PATH`.
- `pnpm cardano:contract:address` also uses `aiken`, not `cardano-cli`.
- `aiken build` generates `plutus.json`, and the build script exports `artifacts/policy_vault.plutus` plus `artifacts/policy_vault.hash`.
- `AuthorizeExecution`, `CompleteExecution`, `UpdatePolicy`, and `Resume` remain fail-closed in the current validator.
- `UpdatePolicy` and `Resume` remain fail-closed until recreated-output continuity is modeled in the validator.

Current generated preprod artifacts in this branch:

- script hash: `d86fb4d585d62b644b02e9c41944b3c23c966b02c768d99aed4a85a7`
- script address: `addr_test1wrvxldx4shtzkeztqt5ugx2yk0pre9ntqtrk3kv6a49gtfc64y7rs`
