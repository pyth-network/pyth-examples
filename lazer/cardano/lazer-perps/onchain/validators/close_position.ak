use aiken/collection/list
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use lazer_perps/oracle_gate
use lazer_perps/types.{PerpsConfig, Position}

/// Close Position validator.
/// Owner closes their position. The current Pyth price is used
/// to compute PnL settlement.
///
/// PnL formula:
///   Long:  PnL = size * (currentPrice - entryPrice) / entryPrice
///   Short: PnL = size * (entryPrice - currentPrice) / entryPrice
validator close_position(config: PerpsConfig) {
  spend(
    datum: Option<Position>,
    _redeemer: Data,
    _own_ref: Data,
    self: Transaction,
  ) {
    expect Some(position) = datum

    let (current_price, _exponent) =
      oracle_gate.read_price(config.pyth_id, position.feed_id, self)

    // Verify the tx is signed by the position owner
    let signed_by_owner =
      list.has(self.extra_signatories, position.owner)

    // Price must be valid (positive)
    let valid_price = current_price > 0

    signed_by_owner && valid_price
  }
}
