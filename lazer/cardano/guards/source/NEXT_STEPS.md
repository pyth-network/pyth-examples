# NEXT STEPS

This is the canonical tracker for the repository. Every new task, bug, review comment, or deployment prerequisite should be added here and checked off when done.

## Rules
- Update this file in the same commit that changes the underlying work.
- Keep items concrete and testable.
- If something is blocked, note the blocker inline instead of deleting the task.

## Current Review Pass

### PR · Landing Custody / Footer
- [x] Clarify that the custody model supports native rails and external multisig integrations like Squads and Safe
- [x] Remove the public GitHub CTA from the landing page
- [x] Upgrade the footer so it acts as product navigation and runtime summary instead of a thin status strip
- [x] Remove the standalone custody/security section and absorb the important point into the main product flow
- [x] Merge the old How It Works and Risk Ladder explanations into one simpler section
- [x] Remove redundant landing explainer sections that were adding more detail than value

### PR · Scaffold Sweep
- [x] Replace residual weak wording in the Aiken scaffold with explicit `scaffold` language
- [x] Port additional pure PolicyVault invariants from the TypeScript simulator into the Aiken helper module
- [x] Reword the pending `pyth-examples` tracker item so it refers to filling real team/contact fields

### PR #14 · Apps Blockchain Surface
- [x] Make manifest paths stable regardless of the caller's current working directory
- [x] Upgrade the manifest tests from substring checks to real filesystem existence checks

### PR #13 · README / Internal Notes
- [x] Align the public Quick Start with the scripts that actually exist in `main`
- [x] Remove the public README link to internal-only notes
- [x] Reword the Next.js section in `INTERNAL_NOTES.md` as a planned migration, not a merged reality
- [x] Remove non-existent root UI scripts from the internal workflow table
- [x] Keep internal asset references aligned with the committed `apps/ui/assets/*.jpeg` files

### PR #12 · DexHunter Live Adapter
- [x] Add a DexHunter API client for estimate/build/sign with partner header auth
- [x] Add a live keeper path that executes from the hot wallet via injected signer/submission hooks
- [x] Record fee breakdown in live execution audit events
- [x] Use DexHunter build totals, not `maxSellAmount`, when recording sold amount and average price
- [x] Refuse live execution when the intent is expired or not yet valid
- [x] Remove unused `CARDANO_STABLE_TOKEN_ID` config and align docs with the actual per-call inputs

### PR #11 · Cardano Aiken Scaffold
- [x] Replace bytearray stub calls in the validator entrypoint with fail-closed scaffold branches
- [x] Make unimplemented admin paths fail closed instead of returning `True`
- [x] Remove hard-coded Pyth policy id literals from the policy helper and compare against datum-carried config instead
- [x] Align scaffolded execution intent/result shapes more closely with the canonical TypeScript model
- [x] Replace absolute local README links with repo-relative links
- [x] Make the cooldown check reflect the intended invariant instead of a no-op timestamp comparison
- [x] Rename the stage-transition helper to document monotonic escalation instead of an identity mapping

### PR #10 · Cardano Custody Model
- [x] Clarify that Tx 1 records the execution intent via current metadata/datum surfaces rather than promising an explicit on-chain intent artifact today

### PR #8 · Protocol Fee Model
- [x] Nest the markdown lists correctly in the protocol-fee doc
- [x] Use explicit percent-point naming in the fee model to match the venue-config layer
- [x] Simplify fee amount rounding with numeric `toFixed` conversions

### PR #7 · Cardano Venue Strategy
- [x] Normalize swap-provider config parsing so env values are whitespace/case tolerant
- [x] Bound venue/protocol fee inputs and reject non-finite values by clamping to safe ranges
- [x] Make fee conversion semantics explicit with both percent-points and rate helpers
- [x] Remove unrelated example secrets from `.env.example`

### PR #9 · Premium UI Overhaul
- [x] Remove brittle `stageColor(...).split(" ")` usage and centralize `RiskStage` presentation helpers
- [x] Derive swap haircut display/math from `policy.haircutBps`
- [x] Guard simulation replay against empty frame sets and improve replay accessibility labels
- [x] Reformat `apps/ui/package.json` and add explicit UI typecheck coverage to the root pipeline
- [x] Normalize demo oracle timestamps to milliseconds and add UI-safe fallbacks for optional data
- [x] Keep the replay/demo deterministic for SSR by using fixed timestamps and a stable reference clock
- [x] Split UI ladder highlighting from raw `RiskStage` so `auto_reentry` can render distinctly from `normal`
- [x] Reuse core-derived domain types in the UI view model instead of duplicating oracle/policy primitives
- [x] Guard swap estimates and replay chart math against invalid oracle prices / zero balances
- [x] Correct UI copy that implied live Pyth integration on Cardano before the real witness path exists
- [x] Separate ladder step identity from `RiskStage` so `auto_reentry` does not alias `normal`
- [x] Point the root `preview` workflow at the Next.js app and keep the static preview server as `preview:legacy`
- [x] Declare the Node runtime floor required by Next 16 / Tailwind 4 and add `baseUrl` for UI path mapping
- [x] Align the `full_exit` label with the rest of the UI as `Full Stable Exit`
- [x] Run root UI scripts through `pnpm --dir apps/ui` so the Next.js binary resolves correctly
- [x] Give policy cards an actual border width so accent border colors render
- [x] Add an explicit `Frozen` ladder step so the UI can represent every `RiskStage`
- [x] Rebase `feature/premium-ui-overhaul` onto `main`, resolve review threads, and re-request Copilot review

### PR #1 · Docs
- [x] Align README wording with the documentation-only state of the branch
- [x] Standardize risk-ladder terminology across README, functional spec, and Copilot instructions
- [x] Clarify `ema_price` vs `emaPrice`
- [x] Clarify the "two-transaction flow" wording in the frontend spec

### PR #2 · Core
- [x] Value stable assets using oracle price when available so depegs affect portfolio math
- [x] Enforce route `chainId` and `live` status in route selection
- [x] Sort snapshot IDs deterministically before hashing/auditing
- [x] Remove root scripts that reference apps before those workspaces exist
- [x] Regenerate the lockfile/workspace state to match the branch contents
- [x] Add a depeg regression test for stable valuation

### PR #3 · Multichain
- [x] Reuse core shared types instead of duplicating multichain primitives
- [x] Align SVM/EVM stage naming with the core risk ladder
- [x] Validate simulation inputs before computing outputs
- [x] Add invalid-pricing regression tests for SVM and EVM

### PR #4 · Cardano
- [x] Replace fragile `try/catch` tests with assertions that fail when no error is thrown
- [x] Enforce `result.routeId === intent.routeId`
- [x] Derive tx validity from intent/policy instead of hardcoded constants
- [x] Reject authorization while an intent is already in flight
- [x] Wire `pythStateReference` into the tx envelope
- [x] Reuse `intent.reasonHash` in the tx metadata
- [x] Validate vault, chain, execution time window, and max sell bounds on completion
- [x] Make simulated `averagePrice` consistent with the trade math

### PR #5 · Apps
- [x] Fix invalid CSS `min()` usage with `calc()`
- [x] Replace broken local docs links in the UI with a safe repo/demo strategy
- [x] Align fallback chip tokens with existing styles
- [x] Escape or avoid unsafe HTML injection in the UI renderer
- [x] Remove the unused backend connector field
- [x] Make audit event ordering deterministic
- [x] Harden preview path resolution against traversal and absolute-path bugs
- [x] Avoid crashing when `Host` is missing in the preview server

### PR #6 · UI Demo
- [x] Make the watch frame deterministic by using a separate watch-only snapshot before partial de-risk
- [x] Validate ladder tone tokens before interpolating them into CSS class names

### PR #15 · Aiken Scaffold Sweep
- [x] Tighten scaffold intent-shape validation so `max_sell_amount` and `min_buy_amount` must be strictly positive
- [x] Require `datum.current_intent_id == Some(intent.intent_id)` before scaffold completion accepts an execution result

## Product / Stack Pending
- [x] Show a clear preprod-only / mainnet-unavailable warning as soon as the app opens
- [x] Document the real preprod vault bootstrap path and its current blockers
- [x] Add a browser-side vault bootstrap lab to the dashboard for custody, thresholds, and reference-target planning
- [x] Add a scenario lab that runs the real risk engine against interactive price and balance inputs
- [x] Add a runtime control panel that switches between mock replay and the preprod-oriented operator snapshot
- [x] Add mock wallet-session scaffolding for Cardano and SVM demo flows
- [x] Add a 7d / 15m historical replay that executes treasury strategies against deterministic mock price states
- [x] Move wallet connect into the dashboard topbar with real-provider detection plus mock fallback
- [x] Replace execution-side multichain readiness copy with active vault/company profile context
- [x] Bootstrap root `.env` and `.env.example` for Pyth/Cardano preprod and deploy settings
- [x] Add `apps/blockchain` as the team-facing collaboration surface for contracts and chain adapters
- [x] Evaluate Cardano aggregator options for integrator fee capture and choose a primary venue
- [x] Define a protocol fee model that can layer on top of venue partner fees with a hard total-fee cap
- [x] Document the Cardano custody model for multisig governance plus automated execution
- [x] Integrate `DexHunter` partner flow for automated swaps
- [ ] Keep `Minswap` as fallback execution path
- [ ] Wire real Cardano wallet/provider dependencies into the DexHunter hot-wallet execution path
- [ ] Surface venue fee + protocol fee breakdown in the operator UI and audit logs
- [ ] Add a target-reference-asset policy mode, e.g. keep ADA exposure equivalent to `XAU/USD` ounces via Pyth feeds
- [x] Encode the bounded helper logic and emergency-withdraw rule in the `Aiken` `PolicyVault` scaffold
- [ ] Add real wallet adapters for Cardano (`CIP-30`) and SVM (`Wallet Standard`) instead of dashboard-side planning states
- [ ] Add a real frontend create-vault transaction flow on top of the preprod bootstrap builder
- [x] Move the Pyth/Cardano live collector source of truth into `apps/blockchain/cardano/offchain`
- [x] Move the Aiken scaffold source of truth into `apps/blockchain/cardano/contracts/aiken`
- [x] Encode the hot-bucket notional cap helpers in the `Aiken` `PolicyVault` scaffold
- [x] Rebuild the operator UI with a Squads-inspired treasury shell and dark dashboard layout
- [x] Add deterministic demo frames and replay controls for the breach -> de-risk -> exit -> recovery scenario
- [x] Refresh the local preview flow so the UI can be shown as a working product demo
- [ ] Finish the remaining `Aiken` validator work for `AuthorizeExecution`, `CompleteExecution`, `UpdatePolicy`, `Resume`, and recreated-output continuity
- [x] Integrate real Pyth signed updates and preprod witness flow
- [x] Add deploy-prep scripts for Aiken contract doctor, blueprint build, and script address derivation
- [ ] Resolve the Pyth State UTxO automatically from a live Cardano provider instead of `.env`
- [ ] Integrate a live Cardano swap venue in the keeper execution path
- [ ] Replace SQLite demo persistence with deployable storage
- [ ] Add CI for tests and typecheck
- [ ] Capture final demo screenshots / recording for the hackathon pitch
- [x] Prepare the `pyth-examples` submission tree under `/lazer/cardano/my-project/`
- [x] Adapt the submission README to the hackathon template from `pyth-examples`
- [x] Open the submission PR from the fork back to `pyth-network/pyth-examples`
- [ ] Fill the final team/contact fields in the `pyth-examples` README and PR body before final submission
- [ ] Review and address feedback on the `pyth-examples` draft PR
