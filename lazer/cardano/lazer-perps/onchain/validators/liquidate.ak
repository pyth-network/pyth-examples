use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use lazer_perps/formulas
use lazer_perps/oracle_gate
use lazer_perps/types.{MarketConfig, PositionDatum}

/// Liquidation validator.
///
/// Anyone can trigger — no owner signature needed.
///
/// Liquidation price formulas:
///   Long:  liq_price = entry_price × (1 - 1/leverage + 0.01)
///   Short: liq_price = entry_price × (1 + 1/leverage - 0.01)
///
/// Trigger condition:
///   Long:  current_price <= liq_price
///   Short: current_price >= liq_price
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

    // Check if position has crossed the liquidation price
    formulas.is_liquidatable(
      position.direction,
      position.entry_price,
      position.leverage,
      current_price,
    )
  }
}
