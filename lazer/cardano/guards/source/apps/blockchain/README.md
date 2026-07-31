# apps/blockchain

This workspace is the team-facing entrypoint for all chain, contract, oracle-witness and execution integration work.

The current implementation still uses `packages/*` as the source of truth for reusable adapters and simulators. This app exists so the team has one obvious place to iterate on:

- Cardano smart contracts / `Aiken`
- off-chain transaction builders
- Pyth witness integration
- swap-venue adapters
- future SVM / EVM execution connectors

## Current rule

Start new blockchain-facing work under `apps/blockchain/*`.

Use `packages/*` for shared libraries and stable adapter code that needs to be imported by backend/UI/tests.

## Layout

- `cardano/contracts`: target home for `Aiken` validators and related test vectors
- `cardano/offchain`: target home for transaction builders, witness preparation and execution services
- `svm`: collaboration surface for Solana/SVM work
- `evm`: collaboration surface for EVM work
- `src/manifests.ts`: machine-readable map of the current source of truth and next planned artifacts

## Today vs next

Today:
- Cardano simulator/spec: `packages/cardano`
- Cardano Aiken scaffold: `apps/blockchain/cardano/contracts/aiken`
- backend orchestration: `apps/backend`
- live Pyth collector + witness wiring: `apps/blockchain/cardano/offchain`
- multichain scaffolding: `packages/svm`, `packages/evm`

Import the live collector explicitly from `@anaconda/blockchain/cardano/offchain`.
The generic `@anaconda/blockchain/cardano` entrypoint stays side-effect free and does not load dotenv or the Pyth SDK.

Next:
- move more live off-chain execution work into `apps/blockchain/cardano/offchain`
- keep reusable types/engines in `packages/core`

## Team workflow

1. Open a feature branch from `main`.
2. Put new chain-facing files under `apps/blockchain/*`.
3. If the change becomes reusable across apps, promote it into `packages/*` in a follow-up commit.
4. Update `NEXT_STEPS.md` when introducing or closing any blockchain task.
