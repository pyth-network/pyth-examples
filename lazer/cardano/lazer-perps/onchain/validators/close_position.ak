use aiken/collection/list
use cardano/transaction.{Transaction}
use lazer_perps/formulas
use lazer_perps/oracle_gate
use lazer_perps/types.{MarketConfig, PositionDatum}

/// Close Position validator.
///
/// Only the trader (trader_pkh) can close their position.
/// Reads the current Pyth price as exit price and computes settlement.
///
/// Formulas used:
///   PnL = direction_multiplier × collateral × leverage × (exit - entry) / entry
///   Payout = max(0, collateral + PnL)
validator close_position(config: MarketConfig) {
  spend(
    datum: Option<PositionDatum>,
    _redeemer: Data,
    _own_ref: Data,
    self: Transaction,
  ) {
    expect Some(position) = datum

    // Read exit price via Pyth oracle gate
    let (exit_price, _exponent) =
      oracle_gate.read_price(config.pyth_id, config.feed_id, self)

    // Only the trader who opened the position can close it
    let signed_by_trader =
      list.has(self.extra_signatories, position.trader_pkh)

    // Prices must be valid
    let valid_prices = exit_price > 0 && position.entry_price > 0

    // Compute PnL and payout for validation
    let pnl =
      formulas.compute_pnl(
        position.direction,
        position.collateral,
        position.leverage,
        position.entry_price,
        exit_price,
      )

    // Payout = max(0, collateral + PnL)
    expect _payout =
      formulas.compute_payout(position.collateral, pnl)

    signed_by_trader && valid_prices
  }
}
