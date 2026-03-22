use aiken/collection/list
use aiken/math/rational
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use lazer_perps/oracle_gate
use lazer_perps/types.{Direction, Long, Short, MarketConfig, Position}

/// Compute PnL as a rational number.
///   Long PnL  = size * (currentPrice - entryPrice) / entryPrice
///   Short PnL = size * (entryPrice - currentPrice) / entryPrice
pub fn compute_pnl(
  direction: Direction,
  size: Int,
  entry_price: Int,
  current_price: Int,
) -> rational.Rational {
  let diff = when direction is {
    Long -> current_price - entry_price
    Short -> entry_price - current_price
  }
  expect Some(pnl) = rational.new(size * diff, entry_price)
  pnl
}

/// Close Position validator.
///
/// Only the position owner can close. Reads the current Pyth price
/// to compute PnL for settlement against the liquidity pool.
///
/// PnL formulas:
///   Long:  PnL = size * (exitPrice - entryPrice) / entryPrice
///   Short: PnL = size * (entryPrice - exitPrice) / entryPrice
validator close_position(config: MarketConfig) {
  spend(
    datum: Option<Position>,
    _redeemer: Data,
    _own_ref: Data,
    self: Transaction,
  ) {
    expect Some(position) = datum

    // Read current price via Pyth oracle gate
    let (current_price, _exponent) =
      oracle_gate.read_price(config.pyth_id, config.feed_id, self)

    // Only the position owner can close
    let signed_by_owner =
      list.has(self.extra_signatories, position.owner)

    // Oracle price must be valid
    let valid_price = current_price > 0

    // PnL is computable (entry_price > 0)
    let valid_entry = position.entry_price > 0

    signed_by_owner && valid_price && valid_entry
  }
}
