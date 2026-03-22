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
- keeper allowlist and route/asset approval helpers
- in-flight intent continuity
- hot-bucket max-notional guard helpers
- completion bounds for `sold_amount` / `bought_amount`

Still pending:

- live validator body wiring
- compiled artifacts / addresses for preprod
- witness and datum/redeemer test vectors
- explicit execution-bucket validator scaffold

Reference simulator/spec:

- `packages/cardano/src/policy-vault.ts`
- `packages/cardano/src/types.ts`

Operational guide:

- [`docs/preprod-vault-bootstrap.md`](../../../../docs/preprod-vault-bootstrap.md)
