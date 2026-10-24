# Vercel Deploy

This repo can be deployed to `Vercel` for the operator UI in `apps/ui`.

## Target

- App: `apps/ui`
- Framework: `Next.js`
- Runtime baseline: `Node >= 24.0.0`

## Why the Vercel config lives in `apps/ui`

The deploy target is the Next app only. The rest of the monorepo contains backend simulation, Cardano off-chain tooling, and contract scaffolding that do not belong in the browser deployment.

`apps/ui/vercel.json` assumes the Vercel project uses:

- Root Directory: `apps/ui`

That lets Vercel treat the UI as the deployable app while still installing the full monorepo from the repository root.

## Required Vercel project settings

1. Import the GitHub repository into Vercel.
2. Set `Root Directory` to `apps/ui`.
3. Keep the commands from `apps/ui/vercel.json`:
   - Install: `cd ../.. && pnpm install --frozen-lockfile`
   - Build: `pnpm build`
   - Dev: `pnpm dev`
4. Set Node.js to `24.x`.

## Why `externalDir` is enabled

The UI imports shared domain types from `packages/core` via the app `tsconfig` path mapping. `externalDir` allows the Next build to consume those shared files while the app is deployed from the `apps/ui` subdirectory.

## Current production scope

This Vercel deployment is for the frontend only:

- dashboard shell
- demo/replay UI
- local static data embedded in the app

It does **not** deploy:

- Cardano keepers
- Pyth live collector jobs
- DexHunter execution services
- SQLite or any deployable backend storage

Those still need a separate runtime such as `Railway`, `Fly.io`, `Render`, or equivalent.

## Environment variables

The current UI does not require wallet or oracle secrets to render. You can deploy the shell without adding the Cardano/Pyth backend secrets to Vercel.

If future UI releases call live backend APIs, add only the public frontend variables there and keep signing keys/provider secrets in the backend runtime.
