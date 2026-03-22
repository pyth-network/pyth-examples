use aiken/math/rational
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use lazer_perps/oracle_gate
use lazer_perps/types.{Direction, Long, Short, PerpsConfig, Position}

/// Compute PnL as a rational number.
///   Long PnL  = size * (current - entry) / entry
///   Short PnL = size * (entry - current) / entry
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
/// Anyone can liquidate if the position is undercollateralized.
///
/// Liquidation formula:
///   remaining = collateral + PnL
///   margin_ratio = remaining / collateral
///   If margin_ratio < liquidation_bps / 10000 → position is liquidatable
validator liquidate(config: PerpsConfig) {
  spend(
    datum: Option<Position>,
    _redeemer: Data,
    _own_ref: Data,
    self: Transaction,
  ) {
    expect Some(position) = datum

    let (current_price, _exponent) =
      oracle_gate.read_price(config.pyth_id, position.feed_id, self)

    let pnl =
      compute_pnl(
        position.direction,
        position.size,
        position.entry_price,
        current_price,
      )

    // remaining = collateral + pnl
    let collateral_rational = rational.from_int(position.collateral)
    let remaining = rational.add(collateral_rational, pnl)

    // Check: remaining * 10000 < collateral * liquidation_bps
    let remaining_scaled =
      rational.mul(remaining, rational.from_int(10000))
    expect Some(threshold) =
      rational.new(position.collateral * config.liquidation_bps, 1)

    // If remaining margin < threshold → undercollateralized → allow liquidation
    rational.compare(remaining_scaled, threshold) == Less
  }
}
