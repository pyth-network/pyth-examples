# Pyth Live Collector

This document describes the first live Pyth integration path wired into `guards.one`.

## Scope

Implemented in this feature:

- fetch a real signed update from `Pyth Pro / Lazer`
- resolve a live price-feed id from a symbol query when needed
- convert the parsed payload into the repo's `OracleSnapshot` shape
- build the Cardano witness envelope used by the current `PolicyVault` simulator:
  - `pythPolicyId`
  - `pythStateReference`
  - `signedUpdateHex`

Current limitation:

- `pythStateReference` still comes from `.env`
- automatic resolution of the `Pyth State` UTxO from a Cardano provider is still pending

## Source of truth

- `apps/blockchain/cardano/offchain/env.ts`
- `apps/blockchain/cardano/offchain/collector.ts`
- `apps/blockchain/cardano/offchain/fixtures.ts`
- `apps/blockchain/cardano/offchain/scripts/fetch-live.ts`

The legacy backend entrypoints now re-export those modules so the rest of the app keeps working while the team migrates more live Cardano code into `apps/blockchain`.

## Live fetch flow

1. Read `PYTH_API_KEY`, `PYTH_PREPROD_POLICY_ID`, `CARDANO_PYTH_STATE_REFERENCE`, and the symbol/feed config from `.env`.
2. Create `PythLazerClient`.
3. Resolve the numeric `pyth_lazer_id` if only a symbol query is configured.
4. Call `getLatestPrice` with:
   - `formats: ["solana"]`
   - `parsed: true`
   - `jsonBinaryEncoding: "hex"`
   - `channel` from env
   - properties:
     - `price`
     - `emaPrice`
     - `confidence`
     - `publisherCount`
     - `exponent`
     - `marketSession`
     - `feedUpdateTimestamp`
5. Convert the parsed response into `OracleSnapshot`.
6. Carry the signed `solana` payload into `CardanoPythWitness.signedUpdateHex`.

## Why `solana` format

The official Cardano integration docs and SDK use the `solana` binary format for the signed update bytes. That same payload is then supplied as the redeemer for the `0-withdrawal` verification step in the Cardano transaction.

## Local verification

```bash
pnpm pyth:fetch-live
```

This live collector path now assumes `Node >= 24`, matching the published engine requirement of `@pythnetwork/pyth-lazer-sdk`.

This command prints:

- resolved live feed id
- normalized snapshot values
- witness metadata for the Cardano path

## References

- Pyth Cardano consumer docs: https://docs.pyth.network/price-feeds/pro/integrate-as-consumer/cardano
- Pyth Pro getting started: https://docs.pyth.network/price-feeds/pro/getting-started
- SDK package: https://www.npmjs.com/package/@pythnetwork/pyth-lazer-sdk
