use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use lazer_perps/oracle_gate
use lazer_perps/types.{PerpsConfig, Position}

/// Open Position validator.
/// Validates that a new position respects leverage limits and
/// that the entry price matches the current Pyth oracle price.
validator open_position(config: PerpsConfig) {
  spend(
    datum: Option<Position>,
    _redeemer: Data,
    _own_ref: Data,
    self: Transaction,
  ) {
    expect Some(position) = datum

    let (current_price, _exponent) =
      oracle_gate.read_price(config.pyth_id, position.feed_id, self)

    // Entry price must match current oracle price
    let price_matches = current_price == position.entry_price

    // Leverage check: size <= collateral * max_leverage
    let leverage_ok =
      position.size <= position.collateral * config.max_leverage

    price_matches && leverage_ok
  }
}
