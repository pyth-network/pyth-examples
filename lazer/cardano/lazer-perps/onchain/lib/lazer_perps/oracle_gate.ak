use aiken/collection/list
use aiken/math/rational
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use pyth
use types/u32

/// Read the raw price and exponent for a feed from the Pyth update.
/// This is the oracle gate — every perps action must go through here.
/// Without a valid Pyth price witness in the tx, this function fails.
pub fn read_price(
  pyth_id: PolicyId,
  feed_id: Int,
  self: Transaction,
) -> (Int, Int) {
  // Verify and extract price data from the Pyth withdrawal redeemer
  let updates = pyth.get_updates(pyth_id, self)
  // Expect exactly one signed update in this transaction
  expect [update] = updates

  expect Some(feed) =
    list.find(update.feeds, fn(f) { u32.as_int(f.feed_id) == feed_id })

  expect Some(Some(price)) = feed.price
  expect Some(exponent) = feed.exponent

  (price, exponent)
}

/// Read price and apply exponent to get a Rational value.
pub fn read_real_price(
  pyth_id: PolicyId,
  feed_id: Int,
  self: Transaction,
) -> rational.Rational {
  let (price, exponent) = read_price(pyth_id, feed_id, self)
  expect Some(multiplier) = rational.from_int(10) |> rational.pow(exponent)
  rational.from_int(price) |> rational.mul(multiplier)
}
