use aiken/collection/list
use aiken/math/rational
use cardano/assets.{PolicyId}
use cardano/transaction.{OutputReference, Transaction}
use pyth
use pyth_types.{AnyPrice, MaxPrice, MinPrice, OracleDatum, PriceRange}
use types/u32

/// ADA/USD feed ID on Pyth Lazer
const ada_usd_feed_id = 16

/// Read ADA/USD price from the verified Pyth update and return it in USD cents.
/// Requires:
///   - Pyth state UTxO as reference_input
///   - Zero-lovelace withdrawal from Pyth withdraw script with signed update as redeemer
fn read_ada_usd_cents(pyth_id: PolicyId, self: Transaction) -> Int {
  // get_updates reads the withdrawal redeemer from the same tx
  expect [update] = pyth.get_updates(pyth_id, self)

  expect Some(feed) =
    list.find(update.feeds, fn(f) { u32.as_int(f.feed_id) == ada_usd_feed_id })

  expect Some(Some(mantissa)) = feed.price
  expect Some(exponent) = feed.exponent

  // price_usd  = mantissa × 10^exponent
  // price_cents = mantissa × 10^(exponent + 2)
  expect Some(multiplier) =
    rational.from_int(10) |> rational.pow(exponent + 2)

  rational.from_int(mantissa)
    |> rational.mul(multiplier)
    |> rational.floor()
}

validator price_validator(pyth_id: PolicyId) {
  spend(
    datum: Option<OracleDatum>,
    _redeemer: Data,
    _input: OutputReference,
    self: Transaction,
  ) {
    expect Some(condition) = datum

    let price_cents = read_ada_usd_cents(pyth_id, self)

    when condition is {
      AnyPrice -> True
      MinPrice { min_price_usd_cents } -> price_cents >= min_price_usd_cents
      MaxPrice { max_price_usd_cents } -> price_cents <= max_price_usd_cents
      PriceRange { lo_cents, hi_cents } ->
        price_cents >= lo_cents && price_cents <= hi_cents
    }
  }

  else(_) {
    fail
  }
}
