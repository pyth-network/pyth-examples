use aiken/collection/list
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use pyth
use types/u32

/// Configuration passed as datum
pub type ThresholdConfig {
  /// Pyth policy ID (hex)
  pyth_id: PolicyId,
  /// Feed ID to check (e.g. 346 = XAU/USD)
  feed_id: Int,
  /// Minimum price (raw integer before exponent) to allow the action
  /// For XAU/USD with exponent -3: threshold 3000000 means $3000.000
  min_price: Int,
}

/// Redeemer: what action the user wants to do
pub type Action {
  /// Mint/borrow — only allowed if price >= threshold
  MintOrBorrow
  /// Close/repay — always allowed
  CloseOrRepay
}

/// Spending validator: checks Pyth price against a threshold.
/// If price >= min_price, MintOrBorrow is allowed.
/// CloseOrRepay is always allowed (safe action).
validator rwa_threshold {
  spend(
    datum: Option<ThresholdConfig>,
    redeemer: Action,
    _own_ref: Data,
    self: Transaction,
  ) {
    expect Some(config) = datum

    when redeemer is {
      // Safe action — always permitted
      CloseOrRepay -> True

      // Risky action — only if collateral price is high enough
      MintOrBorrow -> {
        // Read all verified Pyth price updates from the transaction
        let updates = pyth.get_updates(config.pyth_id, self)
        expect [update] = updates

        // Find our feed in the update
        expect Some(feed) =
          list.find(
            update.feeds,
            fn(f) { u32.as_int(f.feed_id) == config.feed_id },
          )

        // Extract raw price (before applying exponent)
        expect Some(Some(price)) = feed.price

        // Check: price must be at or above threshold
        price >= config.min_price
      }
    }
  }
}
