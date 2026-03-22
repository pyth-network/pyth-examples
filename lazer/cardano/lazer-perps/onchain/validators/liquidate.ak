use aiken/math/rational
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use lazer_perps/oracle_gate
use lazer_perps/types.{
  Direction, Long, Short, MarketConfig, Position,
  liquidation_bps, keeper_fee_bps,
}

/// Compute PnL as a rational number.
fn compute_pnl(
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

/// Liquidation validator.
///
/// Anyone can trigger liquidation if the position is undercollateralized.
/// No owner signature required — this is a public good.
///
/// Liquidation check:
///   remaining = collateral + PnL
///   margin_ratio = remaining / collateral
///   If remaining * 10000 < collateral * liquidation_bps → liquidatable
///
/// Keeper receives 1% of collateral as fee.
/// Remaining collateral goes back to the pool.
validator liquidate(config: MarketConfig) {
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

    // Compute PnL
    let pnl =
      compute_pnl(
        position.direction,
        position.size,
        position.entry_price,
        current_price,
      )

    // remaining = collateral + pnl
    let collateral_r = rational.from_int(position.collateral)
    let remaining = rational.add(collateral_r, pnl)

    // Undercollateralization check:
    // remaining * 10000 < collateral * liquidation_bps
    let remaining_scaled =
      rational.mul(remaining, rational.from_int(10000))
    expect Some(threshold) =
      rational.new(position.collateral * liquidation_bps, 1)

    // Position must be undercollateralized to allow liquidation
    rational.compare(remaining_scaled, threshold) == Less
  }
}
