use aiken/collection/list
use aiken/math/rational
use aiken/math/rational.{Rational}
use cardano/assets.{PolicyId}
use cardano/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction}
use pyth
use types/u32
use common

pub type CommodityDatum {
  operator: VerificationKeyHash,
  buyer: VerificationKeyHash,
  seller: VerificationKeyHash,
  feed_id: Int,
  strike_price: Int,
  floor_price: Int,
  cap_price: Int,
}

pub type CommodityRedeemer {
  allow_flat_settlement: Bool,
}

fn read_price(pyth_id: PolicyId, feed_id: Int, self: Transaction) -> Rational {
  expect [update] = pyth.get_updates(pyth_id, self)
  expect Some(feed) = list.find(update.feeds, fn(feed) {
    u32.as_int(feed.feed_id) == feed_id
  })
  expect Some(Some(price)) = feed.price
  expect Some(exponent) = feed.exponent
  expect Some(multiplier) = rational.from_int(10) |> rational.pow(exponent)

  rational.from_int(price) |> rational.mul(multiplier)
}

fn within_bounds(price: Rational, floor_price: Int, cap_price: Int) -> Bool {
  let floor = rational.from_int(floor_price)
  let cap = rational.from_int(cap_price)

  and {
    rational.compare(price, floor) != Less,
    rational.compare(price, cap) != Greater,
  }
}

validator commodity_escrow(pyth_policy_id: PolicyId) {
  spend(datum: Option<CommodityDatum>, redeemer: CommodityRedeemer, _own_ref: OutputReference, self: Transaction) {
    expect Some(config) = datum
    let oracle_price = read_price(pyth_policy_id, config.feed_id, self)

    and {
      common.is_signed_by(self, config.operator),
      within_bounds(oracle_price, config.floor_price, config.cap_price) || redeemer.allow_flat_settlement,
    }
  }
}
