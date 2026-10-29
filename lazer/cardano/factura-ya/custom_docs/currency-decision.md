# Currency Decision: USD Instead of ARS

> Date: 2026-03-22

## Decision

Invoice amounts are denominated in **USD** instead of ARS (Argentine Pesos).

## Context

The original design (PRD, spec) envisioned invoices in ARS with Pyth providing an ARS/USD exchange rate for conversion. This made sense for the LATAM target market where SMEs issue invoices in local currency.

## Why We Changed

1. **Pyth ARS/USD feed is not available yet.** Feed ID 2582 (USD/ARS) has status "coming soon" with no ETA. It's listed in Pyth's feed catalog but has no active publishers on Cardano.

2. **Pyth ADA/USD is live and stable.** Feed ID 16 (ADA/USD) has 3+ publishers, exponent -8, and is fully operational on Cardano PreProd. Using this feed gives us a working oracle integration today.

3. **Simpler conversion path.** With USD-denominated invoices:
   - Investor pays in ADA
   - Contract reads ADA/USD from Pyth
   - Validates payment ≥ invoice amount in USD
   - One conversion step (USD → ADA), not two (ARS → USD → ADA)

4. **Hackathon scope.** For the MVP, demonstrating a working Pyth oracle integration matters more than ARS support. USD works for the demo and the on-chain logic is identical — only the feed ID changes.

## What Changes

| Before | After |
|--------|-------|
| `amount_ars: Int` in InvoiceDatum | `amount_usd: Int` |
| `original_amount_ars` in ListingDatum | `original_amount_usd` |
| `usd_to_lovelace()` converts USD→ADA | Same function, same logic |
| UI shows "ARS" labels | UI shows "USD" labels |
| Would need ARS/USD + ADA/USD feeds | Only needs ADA/USD feed (live) |

## Path to ARS Support

When Pyth feed 2582 (USD/ARS) goes live:

1. Add a second oracle call for ARS/USD conversion
2. Change datum fields back to `amount_ars`
3. The conversion becomes: `ars_amount → (÷ ars_usd_price) → usd_amount → (÷ ada_usd_price) → ada_amount`
4. Both price feeds are validated for freshness in the same transaction
5. No contract architecture changes needed — just an additional price lookup

The on-chain `pyth_oracle.ak` module already supports any feed ID via parameter. Switching to ARS is a config change, not a code change.
