use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use lazer_perps/oracle_gate
use lazer_perps/types.{MarketConfig, PositionDatum}

/// Open Position validator.
///
/// Validates that a new position:
///   1. Has a valid Pyth price witness (entry_price == oracle price)
///   2. Respects the market's leverage cap
///   3. Meets minimum collateral requirement
///   4. Feed ID matches the market config
validator open_position(config: MarketConfig) {
  spend(
    datum: Option<PositionDatum>,
    _redeemer: Data,
    _own_ref: Data,
    self: Transaction,
  ) {
    expect Some(position) = datum

    // Read current oracle price via the Pyth oracle gate
    let (current_price, _exponent) =
      oracle_gate.read_price(config.pyth_id, config.feed_id, self)

    // 1. Feed ID in datum must match market config
    let feed_matches = position.feed_id == config.feed_id

    // 2. Entry price must match current oracle price
    let price_valid = current_price == position.entry_price

    // 3. Leverage must be within cap
    let leverage_ok =
      position.leverage > 0 && position.leverage <= config.leverage_cap

    // 4. Minimum collateral (in micro USDCx)
    let collateral_ok = position.collateral >= config.min_collateral

    feed_matches && price_valid && leverage_ok && collateral_ok
  }
}
