# Cardano Contracts

This directory now holds the live Cardano on-chain collaboration surface.

Current source of truth here:

- `aiken/aiken.toml`
- `aiken/lib/guards_one/types.ak`
- `aiken/lib/guards_one/policy_vault.ak`
- `aiken/validators/policy_vault.ak`
- `aiken/test/policy_vault.ak`

What this scaffold already captures:

- datum/redeemer modeling for `PolicyVault`
- payload-carrying authorize/complete redeemers
- keeper allowlist and route/asset approval helpers
- in-flight intent continuity
- hot-bucket max-notional guard helpers
- completion bounds for `sold_amount` / `bought_amount`
- fail-closed validator spend branches for authorize/complete until continuity checks land
- governance emergency withdraw recovery path

Still pending:

- custody-safe continuing-output checks for `AuthorizeExecution` / `CompleteExecution`
- recreated-output continuity for `UpdatePolicy` / `Resume`
- compiled artifacts / addresses for preprod in an environment with `aiken`
- witness and datum/redeemer test vectors with the Aiken toolchain
- explicit execution-bucket validator scaffold

Reference simulator/spec:

- `packages/cardano/src/policy-vault.ts`
- `packages/cardano/src/types.ts`

Operational guide:

- [`docs/preprod-vault-bootstrap.md`](../../../../docs/preprod-vault-bootstrap.md)
- `aiken/scripts/doctor.sh`
- `aiken/scripts/build.sh`
- `aiken/scripts/derive-address.sh`
