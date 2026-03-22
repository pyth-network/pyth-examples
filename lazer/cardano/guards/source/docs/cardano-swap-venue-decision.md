# Cardano Swap Venue Decision

## Decision
Use `DexHunter` as the primary Cardano swap aggregator for automated treasury execution and protocol-fee monetization.

Keep `Minswap Aggregator` as the fallback integration path when:
- we need a simpler unsigned-transaction build path quickly,
- a specific pair or route is missing from the DexHunter partner flow,
- or we need a secondary venue for resilience during the hackathon.

## Why DexHunter is the primary choice
- It is positioned as a Cardano DEX aggregator and partner-facing API, which makes it the closest match to a Jupiter-style integration on Cardano.
- Their partner docs require an `X-Partner-Id` header on requests, which is a strong signal that routing and analytics are built around partner-level integrations.
- DexHunter partner onboarding explicitly includes a custom percentage fee and profit split setup, which maps directly to the `guards.one` business model of taking a fee on automated protective swaps.

## Why Minswap remains relevant
- Minswap exposes an official aggregator API with `/estimate` and `/build-tx`, which is a clean path for building unsigned Cardano swap transactions.
- Their docs expose `partner` / `partnerCode` style integration points and fee fields such as `aggregator_fee` and `aggregator_fee_percent` in the estimate response.
- That makes Minswap a reasonable fallback if we want a second venue or if DexHunter partner configuration is not ready in time.

## Business Model Mapping
For `guards.one`, swap monetization should be explicit and bounded:

1. A treasury policy breach triggers an automatic protective swap.
2. The execution route is sent through the configured Cardano aggregator.
3. The venue-integrator fee or partner fee becomes part of the business model.
4. The fee policy must remain visible in the operator dashboard and documented in governance-facing docs.

We should not hide this fee inside slippage. It needs to be:
- configured in env,
- documented in the route policy,
- and auditable alongside the swap result.

## Integration Strategy

### Phase 1
- Default provider: `DexHunter`
- Config surface:
  - `CARDANO_SWAP_PROVIDER=dexhunter`
  - `CARDANO_PROTOCOL_FEE_BPS`
  - `DEXHUNTER_PARTNER_ID`
  - `DEXHUNTER_PARTNER_FEE_PERCENT`

### Phase 2
- Add `Minswap` fallback support with:
  - `MINSWAP_AGGREGATOR_URL`
  - `MINSWAP_PARTNER_CODE`

### Phase 3
- Wire live route building and settlement into the keeper execution path.
- Surface fee and venue metadata in audit logs and the operator UI.

## Risks / Open Questions
- DexHunter custom fee handling may be controlled partly from partner configuration rather than solely per-request payload.
- Minswap public docs clearly expose partner tracking and fee fields in responses, but the exact commercial model should be validated before relying on it as the primary revenue path.
- We still need to validate which venue gives the cleanest fit for automated treasury swaps from a hot wallet on Cardano preprod.

## Recommendation
Ship the next live-swap integration against `DexHunter`, but keep the route abstraction venue-agnostic so `Minswap` can be added as a fallback without rewriting the business logic.

## References
- [DexHunter partner docs](https://dexhunter.gitbook.io/dexhunter-partners/)
- [Minswap aggregator API](https://docs.minswap.org/developer/aggregator-api)
- [Minswap widget integration](https://docs.minswap.org/developer/widget-integration)
