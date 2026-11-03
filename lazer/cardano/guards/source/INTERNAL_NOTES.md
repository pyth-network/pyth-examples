# Internal Notes

> This document captures internal context, architectural decisions, and development history that are useful for the team but not relevant to the public-facing README. Keep it updated as the project evolves.

---

## Origin

Guards was originally built for the **Buenos Aires Pythathon** (Pyth Network hackathon). The challenge was to demonstrate meaningful use of Pyth oracle data beyond simple price feeds. We chose treasury risk management because it requires multiple oracle signals (price, EMA, confidence, freshness) and turns them into real execution decisions — not just charts.

The public branding is `guards.one`. The internal package namespace is `anaconda` (the original project codename).

## Why Treasury Risk Management

We evaluated several directions before settling on treasury policy enforcement:

- **Price alerts** — too simple, no execution surface
- **DEX aggregation** — competitive space, oracle usage is shallow
- **Lending protocol** — requires deep on-chain infra, too much scope for a hackathon
- **Treasury autopilot** — needs multiple oracle signals, has a clear execution model, and solves a real problem for DAOs

The insight was that DAOs define risk in percentages but fail when absolute fiat floors are breached. Most treasury tooling is passive. Guards makes it active.

## Key Architectural Decisions

### Chain-agnostic core from day one

Even though Cardano was the only live target, we built `packages/core` with zero chain imports. This was intentional: if the core engine depends on Cardano types, adding Solana or EVM later requires a refactor. By isolating the business logic early, each chain adapter only needs to implement `TreasuryConnector`.

**Trade-off:** More upfront abstraction work. Worth it for multichain credibility.

### Split custody model

We deliberately avoided the pattern where automated bots spend from the governance multisig. Instead, governance pre-approves a bounded execution bucket. The keeper can only swap within policy limits from the hot wallet. This is safer and more realistic for production DAOs.

### Risk ladder over binary modes

Early versions had a simple "safe/risky" toggle. We replaced it with a 6-stage risk ladder (Normal → Watch → Partial De-Risk → Full Exit → Frozen → Re-Entry) because:
- Gradual escalation reduces unnecessary trading
- Frozen state handles oracle quality degradation
- Re-entry with hysteresis prevents oscillation
- Each stage is explainable to auditors and governance

### DexHunter as primary venue

Chosen over Minswap because DexHunter offers:
- Partner fee infrastructure (revenue capture)
- Aggregated routing across Cardano DEXs
- API-first design suitable for automated execution

Minswap is kept as fallback. The venue layer is abstracted so adding new venues is straightforward.

### Static UI → Next.js migration plan

The repository currently serves the operator demo through the static preview flow. A richer Next.js UI exists as a parallel feature branch and is intended to replace the static shell once it lands.

Why that migration still matters:
- component-based architecture
- stricter type safety around the operator surface
- better developer experience for larger UI changes
- a cleaner path to a production-ready build pipeline

Design direction: premium dark theme inspired by [squads.xyz](https://squads.xyz), with electric blue (#3b82f6) accents on deep black (#08090c). The goal is to feel like institutional-grade treasury tooling, not a hackathon project.

## Development Workflow

### Worktree-based feature branches

We use `git worktree` for parallel feature development. Each feature gets its own directory:

```bash
git worktree add ../anaconda-<feature> feature/<branch-name>
```

This allows working on multiple features simultaneously without branch switching.

### PR review flow

- Every feature branch gets a PR against `main`
- Copilot review is requested on each PR
- Review comments are tracked in `NEXT_STEPS.md`

### Monorepo scripts

| Script | Purpose |
|--------|---------|
| `pnpm test` | Run vitest across all packages |
| `pnpm typecheck` | TypeScript strict mode check |
| `pnpm simulate` | End-to-end backend simulation |
| `pnpm export:ui-data` | Generate demo state JSON for UI |
| `pnpm preview` | Backend server + operator demo at :4310 |

## PR History & Review Tracker

| PR | Scope | Status |
|----|-------|--------|
| #1 | Documentation bootstrap | Merged |
| #2 | Core policy engine | Merged |
| #3 | SVM + EVM scaffolds | Merged |
| #4 | Cardano PolicyVault simulator | Merged |
| #5 | Backend orchestration + legacy UI | Merged |
| #7 | Cardano swap venue strategy | Merged |
| #8 | Protocol fee model | Merged |
| #9 | Premium UI overhaul (Next.js) | Open |
| #10 | Cardano custody model | Merged |
| #12 | DexHunter live adapter | Merged |

Detailed review items and their resolution are tracked in [NEXT_STEPS.md](./NEXT_STEPS.md).

## Tooling & AI-Assisted Development

### Skills & MCP integrations

| Tool | Purpose | Config |
|------|---------|--------|
| Nano Banana 2 | Logo/image generation via Gemini 3.1 Flash | `~/tools/nano-banana-2`, key in `~/.nano-banana/.env` |
| 21st.dev Magic | AI-powered UI component generation | MCP in `~/.claude.json` |
| Replicate | Additional AI model access | API token in `.env` |

### Generated assets

- `apps/ui/public/guards-logo.png` — Shield + "GUARDS" wordmark, white on transparent background. Used across navbar, sidebar, footer, and README. Favicon is configured separately as `/guards-icon.svg`.

## Pending Work

See [NEXT_STEPS.md](./NEXT_STEPS.md) for the full backlog. Key priorities:

1. **Wire real Cardano wallet** into DexHunter execution path
2. **Port PolicyVault to Aiken** (on-chain validator)
3. **Integrate real Pyth signed updates** on preprod
4. **Surface fee breakdown** in operator UI
5. **Add CI** for tests and typecheck
6. **Deploy storage** — replace SQLite with production-grade persistence

## Team & Contact

This project is maintained by the SOLx-AR team. For questions or collaboration, reach out through the GitHub organization.
