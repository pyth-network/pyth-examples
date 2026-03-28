use utils.{compute_expected_synth_amount}

// ── Mint condition ────────────────────────────────────────────────────────────
//
// Spec: given ADA deposited, the minted synth amount must equal:
//   compute_expected_synth_amount(ada_deposited, raw_price, exponent)
//     * 100 / collateral_ratio
//
// Scenario: ADA/USD = $1.00, collateral_ratio = 150
//   Depositing 1.5 ADA ($1.50) must mint exactly $1.00 of synth (1_000_000 micro-USD).
//   Derivation:
//     base   = 1_500_000 * 100_000_000 / 10^8 = 1_500_000 micro-USD
//     minted = 1_500_000 * 100 / 150          = 1_000_000 micro-USD ✓

test mint_1_5_ada_yields_1_usd_at_150_pct_collateral() {
  let ada_deposited = 1_500_000
  let raw_price = 100_000_000
  let exponent = -8
  let collateral_ratio = 150
  let minted_amount = 1_000_000

  let expected_minted_amount =
    compute_expected_synth_amount(ada_deposited, raw_price, exponent)
      * 100
      / collateral_ratio

  minted_amount == expected_minted_amount
}
