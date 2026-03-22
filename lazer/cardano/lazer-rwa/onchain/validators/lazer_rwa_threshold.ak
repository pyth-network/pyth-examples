use aiken/collection/list
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use pyth
use types/u32

/// On-chain configuration for the lazer-rwa threshold validator.
/// Stored as inline datum at the script UTxO.
pub type LazerRwaConfig {
  /// Policy ID of the Pyth deployment on Cardano
  pyth_id: PolicyId,
  /// Pyth Lazer feed ID for the target RWA asset (e.g. 346 = XAU/USD)
  feed_id: Int,
  /// Minimum raw price required to allow risky actions.
  /// Raw value before applying exponent (e.g. 3000000 = $3000 with exponent -3)
  min_price: Int,
}

/// Actions the user can perform against the validator.
pub type LazerRwaAction {
  /// Mint or borrow against RWA collateral — only if price >= min_price
  MintRwa
  /// Burn tokens or close position — always allowed (safe action)
  BurnOrClose
}

/// Spending validator for lazer-rwa.
/// Consumes Pyth Lazer price feeds on-chain to enforce a collateral
/// threshold on RWA assets before allowing minting or borrowing.
validator lazer_rwa_threshold {
  spend(
    datum: Option<LazerRwaConfig>,
    redeemer: LazerRwaAction,
    _own_ref: Data,
    self: Transaction,
  ) {
    expect Some(config) = datum

    when redeemer is {
      // Burn or close — safe action, always permitted
      BurnOrClose -> True

      // Mint RWA — risky action, requires price verification
      MintRwa -> {
        // Verify and extract price data from the Pyth withdrawal redeemer
        let updates = pyth.get_updates(config.pyth_id, self)
        // Expect exactly one signed update in this transaction
        expect [update] = updates

        // Locate the feed matching our configured RWA asset
        expect Some(feed) =
          list.find(
            update.feeds,
            fn(f) { u32.as_int(f.feed_id) == config.feed_id },
          )

        // Extract the raw price value
        expect Some(Some(price)) = feed.price

        // Threshold check: collateral price must be sufficient
        price >= config.min_price
      }
    }
  }
}
