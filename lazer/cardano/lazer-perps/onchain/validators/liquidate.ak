use aiken/math/rational
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use lazer_perps/oracle_gate
use lazer_perps/types.{
  Direction, Long, Short, MarketConfig, PositionDatum,
  liquidation_bps, keeper_fee_bps,
}

/// Compute PnL as a rational number.
fn compute_pnl(
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

/// Liquidation validator.
///
/// Anyone can trigger liquidation — no owner signature needed.
///
/// Liquidation check:
///   remaining = collateral + PnL
///   If remaining * 10000 < collateral * liquidation_bps (8000) → liquidatable
///
/// On liquidation:
///   - Keeper receives 1% of collateral as fee
///   - Remaining goes back to the liquidity pool
///   - Position eUTxO is consumed (destroyed)
validator liquidate(config: MarketConfig) {
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

    // Compute PnL using position's leverage
    let pnl =
      compute_pnl(
        position.direction,
        position.collateral,
        position.leverage,
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
