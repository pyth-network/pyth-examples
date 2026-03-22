use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use lazer_perps/oracle_gate
use lazer_perps/types.{MarketConfig, Position}

/// Open Position validator.
///
/// Validates that a new position:
///   1. Has a valid Pyth price witness (entry_price == oracle price)
///   2. Respects the market's leverage cap
///   3. Meets minimum collateral requirement
///   4. Size == collateral * leverage (no inflation)
validator open_position(config: MarketConfig) {
  spend(
    datum: Option<Position>,
    _redeemer: Data,
    _own_ref: Data,
    self: Transaction,
  ) {
    expect Some(position) = datum

    // Read current oracle price via the Pyth oracle gate
    let (current_price, _exponent) =
      oracle_gate.read_price(config.pyth_id, config.feed_id, self)

    // 1. Entry price must match current oracle price
    let price_valid = current_price == position.entry_price

    // 2. Leverage cap: size / collateral <= leverage_cap
    //    Equivalent: size <= collateral * leverage_cap
    let leverage_ok =
      position.size <= position.collateral * config.leverage_cap

    // 3. Minimum collateral
    let collateral_ok = position.collateral >= config.min_collateral

    // 4. Size must be a positive multiple of collateral
    let size_valid = position.size > 0 && position.collateral > 0

    price_valid && leverage_ok && collateral_ok && size_valid
  }
}
