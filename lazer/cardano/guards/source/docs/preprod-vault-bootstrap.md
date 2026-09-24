# Cardano Preprod Vault Bootstrap

This document describes the minimum path to create and test a real `guards.one` vault on Cardano preprod.

## Current status

What is already live in the repo:

- a live Pyth signed-update collector under [`apps/blockchain/cardano/offchain`](../apps/blockchain/cardano/offchain)
- a DexHunter execution adapter and fee model in the backend/orchestration layer
- a `PolicyVault` simulator/spec in TypeScript
- an `Aiken` scaffold for the on-chain port under [`apps/blockchain/cardano/contracts/aiken`](../apps/blockchain/cardano/contracts/aiken)
- deploy-prep scripts for contract doctor, blueprint build, script export, hash derivation, and address derivation

What is not complete yet:

- the `PolicyVault` validator is not deployed on preprod yet and its authorize/complete branches remain fail-closed
- the app does not have wallet login or a live rule editor yet
- mainnet execution is intentionally disabled
- the Pyth state UTxO still depends on explicit configuration instead of provider discovery

## What we need before creating a real vault

1. A Cardano preprod provider.
   Recommended first path: `Blockfrost`.
2. A funded governance wallet on preprod.
3. A funded execution hot wallet on preprod.
4. A Pyth API key and the preprod Pyth policy id.
5. A resolved `Pyth State` reference UTxO.
6. A compiled and deployed `PolicyVault` validator.
7. A bootstrap transaction builder that creates:
   - the initial `PolicyVault` state UTxO
   - the bounded execution bucket / hot-wallet rails
   - the first policy datum

## Funding

For preprod testing, fund the governance wallet and the execution hot wallet from the official Cardano testnet faucet documented in the Cardano testnets docs.

Recommended split:

- governance wallet: enough ADA to deploy scripts, create the vault UTxO, and update policy state
- execution hot wallet: enough ADA to cover automated swap tests plus fees

Do not fund these wallets with production assumptions. Treat them as disposable preprod rails.

## Environment

Minimum `.env` values:

```env
PYTH_API_KEY=...
PYTH_PREPROD_POLICY_ID=d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6

CARDANO_NETWORK=preprod
CARDANO_PROVIDER=blockfrost
CARDANO_PROVIDER_URL=https://cardano-preprod.blockfrost.io/api/v0
CARDANO_BLOCKFROST_PROJECT_ID=...

CARDANO_PYTH_STATE_REFERENCE=<preprod pyth state utxo>

CARDANO_GOVERNANCE_WALLET_ADDRESS=...
CARDANO_GOVERNANCE_SKEY_PATH=./secrets/governance.skey

CARDANO_EXECUTION_HOT_WALLET_ADDRESS=...
CARDANO_EXECUTION_HOT_WALLET_SKEY_PATH=./secrets/execution-hot.skey

CARDANO_EXECUTION_ROUTE_ID=cardano-minswap-ada-usdm
DEXHUNTER_PARTNER_ID=...
```

Contract deploy-prep commands:

```bash
pnpm cardano:contract:doctor
pnpm cardano:contract:build
pnpm cardano:contract:address
```

Notes:

- `pnpm cardano:contract:build` runs `aiken build` in `apps/blockchain/cardano/contracts/aiken`.
- `pnpm cardano:contract:build` also exports `artifacts/policy_vault.plutus` and `artifacts/policy_vault.hash`.
- `pnpm cardano:contract:address` derives `artifacts/policy_vault.addr` directly from the Aiken blueprint.
- `AuthorizeExecution`, `CompleteExecution`, `UpdatePolicy`, and `Resume` remain intentionally fail-closed until custody-safe continuity and on-chain oracle checks are modeled.

Current generated preprod script identity from this branch:

- `policy_vault.hash`: `d86fb4d585d62b644b02e9c41944b3c23c966b02c768d99aed4a85a7`
- `policy_vault.addr`: `addr_test1wrvxldx4shtzkeztqt5ugx2yk0pre9ntqtrk3kv6a49gtfc64y7rs`

## Validation before deployment

1. Verify Pyth access:

```bash
pnpm pyth:fetch-live
```

This confirms:

- the API key works
- the ADA feed resolves
- a signed update can be fetched
- the Cardano witness envelope is constructed

2. Verify the repo state:

```bash
pnpm typecheck
pnpm test
```

## Vault creation sequence

This is the intended sequence once the validator wiring is complete.

1. Compile and deploy the `PolicyVault` script to Cardano preprod.
2. Record:
   - script address
   - reference script or script hash
   - datum shape/version
3. Resolve the Pyth state UTxO from the provider.
4. Build a governance-signed bootstrap transaction that:
   - creates the initial vault state UTxO
   - stores the approved route ids
   - stores portfolio floors and risk thresholds
   - stores the governance signer set and keeper allowlist
5. Fund the execution hot wallet or execution bucket with a bounded amount.
6. Run a first Pyth-backed authorization flow.
7. Execute a small bounded swap on preprod.
8. Confirm audit continuity between:
   - oracle snapshot
   - execution intent
   - swap result

## First policy shape to support

The simplest live policy should be:

- primary risk asset: `ADA`
- stable rail: `USDM` or another approved stable
- portfolio floor in fiat/stables
- partial de-risk threshold
- full stable exit threshold
- re-entry threshold

This is already aligned with the current demo and keeper path.

## Reference-asset mode

Yes, we can support a policy like:

- "keep ADA exposure equivalent to X ounces of gold"

That requires:

- `ADA/USD` from Pyth
- `XAU/USD` from Pyth
- market-hours handling for gold feeds

Target ADA amount:

```text
target_ada = (target_ounces * xau_usd) / ada_usd
```

That policy mode is not wired into the live UI yet, but it is a valid next extension of the policy engine.

## What the UI can and cannot do today

Today:

- show the treasury shell and policy surfaces
- edit a browser-side vault bootstrap draft
- run scenario simulations against the real risk engine
- show preprod status
- show oracle-backed demo state

Not today:

- wallet login
- create a vault from the browser
- edit and submit a live policy from the browser

Those need a dedicated wallet adapter layer and real Cardano transaction builders.
