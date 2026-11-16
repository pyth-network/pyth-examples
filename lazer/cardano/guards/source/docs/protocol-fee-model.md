# Protocol Fee Model

As of March 22, 2026, the public documentation we found does not show a Cardano swap aggregator with a clearly documented, self-serve integrator fee model that is obviously more generous than the DexHunter partner flow.

That means `guards.one` should not depend on the aggregator alone to reach a target monetization level such as `~1%`.

## Recommended fee stack

Use two separate fee layers:

1. Venue / partner fee
   - Captured through the aggregator integration when supported.
   - For `DexHunter`, this maps to the partner configuration and `X-Partner-Id` flow.
   - For `Minswap`, treat partner metadata as fallback / tracking unless the commercial model is explicitly confirmed.

2. Protocol fee
   - Charged by `guards.one` as an explicit treasury automation fee.
   - Applied outside the venue fee logic.
   - Accounted for separately in the audit log and UI.

## Why this is the right model

- It keeps monetization under our control.
- It avoids coupling the business model to undocumented aggregator economics.
- It lets governance cap total fees regardless of venue.
- It is easier to explain to users and judges because the protocol fee is explicit.

## Default policy

- `partner fee`: venue-specific
- `protocol fee`: configurable via `CARDANO_PROTOCOL_FEE_BPS`
- `max total fee`: configurable via `CARDANO_MAX_TOTAL_FEE_BPS`
- `protocol fee mode`: `explicit_output` by default

## Fee modes

### `explicit_output`
The swap executes at the venue, then the protocol takes its fee as an explicit output in the settlement asset.

Use this when:
- we want clean accounting,
- we want a visible revenue line item,
- we want the operator UI to explain exactly what happened.

### `post_swap_reconciliation`
The keeper records the protocol fee obligation separately and settles it after the swap lifecycle.

Use this when:
- the execution venue limits direct fee extraction,
- the settlement path requires separate operational handling.

### `none`
Disable the protocol fee while still allowing venue / partner economics.

## Guardrails

- Cap total fee with `CARDANO_MAX_TOTAL_FEE_BPS`.
- Never hide the fee inside slippage.
- Show venue fee, protocol fee, and total fee separately in audit logs.
- Reject execution if the policy would exceed the configured cap.

## Practical recommendation

For the MVP:
- use `DexHunter` as the primary venue,
- keep venue fee modest,
- layer a protocol fee on top,
- cap the total at a governance-approved threshold such as `100 bps`.

That gives `guards.one` a monetization path near `1%` without depending on an undocumented aggregator payout schedule.
