# NEXT STEPS

This is the canonical tracker for the repository. Every new task, bug, review comment, or deployment prerequisite should be added here and checked off when done.

## Rules
- Update this file in the same commit that changes the underlying work.
- Keep items concrete and testable.
- If something is blocked, note the blocker inline instead of deleting the task.

## Current Review Pass

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

## Product / Stack Pending
- [x] Bootstrap root `.env` and `.env.example` for Pyth/Cardano preprod and deploy settings
- [x] Rebuild the operator UI with a Squads-inspired treasury shell and dark dashboard layout
- [x] Add deterministic demo frames and replay controls for the breach -> de-risk -> exit -> recovery scenario
- [x] Refresh the local preview flow so the UI can be shown as a working product demo
- [ ] Port `PolicyVault` to `Aiken`
- [ ] Integrate real Pyth signed updates and preprod witness flow
- [ ] Integrate a live Cardano swap venue
- [ ] Replace SQLite demo persistence with deployable storage
- [ ] Add CI for tests and typecheck
- [ ] Capture final demo screenshots / recording for the hackathon pitch
- [ ] Prepare the `pyth-examples` submission tree under `/lazer/cardano/my-project/`
- [ ] Adapt the submission README to the hackathon template from `pyth-examples`
- [ ] Open the submission PR from the fork back to `pyth-network/pyth-examples`
