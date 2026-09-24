# Copilot Review Instructions

Review this repository as a treasury automation system where oracle correctness and bounded execution matter more than stylistic preferences.

Focus on:
- risk-ladder invariants across `Normal -> Watch -> Partial DeRisk -> Full Stable Exit -> Frozen`, plus the `Auto Re-entry` recovery path
- oracle guardrails: stale data rejection, confidence thresholds, cooldown handling, and deterministic use of snapshots
- execution safety: approved routes only, bounded sell amounts, min-buy enforcement, reason hashes, and reproducible audit trails
- multichain discipline: shared core logic must remain chain-agnostic and adapters must not leak Cardano-specific assumptions back into `packages/core`
- tests: missing edge cases, regressions in partial de-risk sizing, full exit behavior, or re-entry hysteresis

Prioritize bugs, broken invariants, security gaps, and missing tests. De-prioritize cosmetic refactors unless they affect correctness or maintainability.
