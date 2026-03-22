use aiken/collection/dict as dict
use aiken/collection/list
use aiken/math/rational.{denominator, numerator}
use cardano/assets.{PolicyId, tokens}
use cardano/transaction.{Transaction}
use hermes_types.{PosixTime, Price}
use pyth
use types/u32
use types/u64

pub fn validate_only_burn(policy_id: PolicyId, tx: Transaction) -> Bool {
  // For this policy, all qtys are negative
  let Transaction { mint, .. } = tx

  dict.foldl(
    tokens(mint, policy_id),
    True,
    fn(_, qty, acc) -> Bool { acc && qty < 0 },
  )
}

pub fn read_btc_usd_price(
  pyth_id: PolicyId,
  start_time: PosixTime,
  self: Transaction,
) -> Price {
  expect [update] = pyth.get_updates(pyth_id, self)
  expect Some(feed) =
    list.find(update.feeds, fn(feed) { u32.as_int(feed.feed_id) == 1 })
  expect Some(Some(price)) = feed.price
  expect Some(exponent) = feed.exponent

  expect Some(multiplier) = rational.from_int(10) |> rational.pow(exponent)
  let rat_price = rational.from_int(price) |> rational.mul(multiplier)

  let update_timestamp = update.timestamp_us

  expect u64.as_int(update_timestamp) == start_time * 1000

  Price { denominator: denominator(rat_price), numerator: numerator(rat_price) }
}
