use aiken/collection/list
use aiken/math/rational
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use lazer_perps/oracle_gate
use lazer_perps/types.{Direction, Long, Short, MarketConfig, PositionDatum}

/// Compute PnL as a rational number.
///   Long PnL  = (collateral * leverage) * (exitPrice - entryPrice) / entryPrice
///   Short PnL = (collateral * leverage) * (entryPrice - exitPrice) / entryPrice
pub fn compute_pnl(
  direction: Direction,
  collateral: Int,
  leverage: Int,
  entry_price: Int,
  current_price: Int,
) -> rational.Rational {
  let size = collateral * leverage
  let diff = when direction is {
    Long -> current_price - entry_price
    Short -> entry_price - current_price
  }
  expect Some(pnl) = rational.new(size * diff, entry_price)
  pnl
}

/// Close Position validator.
///
/// Only the position owner (trader_pkh) can close.
/// Reads the current Pyth price for PnL settlement.
///
/// PnL formulas:
///   Long:  PnL = size * (exitPrice - entryPrice) / entryPrice
///   Short: PnL = size * (entryPrice - exitPrice) / entryPrice
///   where size = collateral * leverage
validator close_position(config: MarketConfig) {
  spend(
    datum: Option<PositionDatum>,
    _redeemer: Data,
    _own_ref: Data,
    self: Transaction,
  ) {
    expect Some(position) = datum

    // Read current price via Pyth oracle gate
    let (current_price, _exponent) =
      oracle_gate.read_price(config.pyth_id, config.feed_id, self)

    // Only the trader who opened the position can close it
    let signed_by_trader =
      list.has(self.extra_signatories, position.trader_pkh)

    // Oracle price must be valid
    let valid_price = current_price > 0

    // Entry price must be valid for PnL computation
    let valid_entry = position.entry_price > 0

    signed_by_trader && valid_price && valid_entry
  }
}
