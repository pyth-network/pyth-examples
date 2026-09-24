# Cardano Offchain

This directory now holds the live Cardano off-chain Pyth wiring and the first execution-facing modules that the team should extend.

Current source of truth in this directory:

- `env.ts`: Cardano/Pyth runtime env loading
- `collector.ts`: in-memory snapshot collector plus live `PythLazer` signed-update fetcher
- `fixtures.ts`: demo witness + primary feed request builder
- `scripts/fetch-live.ts`: local CLI to fetch a real signed update and snapshot from Pyth

Still pending migration into this directory:

- `apps/backend/src/keeper.ts`
- `apps/backend/src/swap-venue.ts`
- `apps/backend/src/protocol-fee.ts`
- `apps/backend/src/dexhunter-live.ts`
- `apps/backend/src/dexhunter-keeper.ts`

Quick check:

```bash
pnpm pyth:fetch-live
```

That command uses `.env`, fetches a real signed update from Pyth Pro/Lazer, and prints the snapshot plus the Cardano witness envelope (`pythPolicyId`, `pythStateReference`, `signedUpdateHexLength`).

Operational guide:

- [`docs/preprod-vault-bootstrap.md`](../../../../docs/preprod-vault-bootstrap.md)
