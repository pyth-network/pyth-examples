use aiken/collection/list
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use pyth
use types/u32

/// On-chain configuration for the lazer-rwa threshold validator.
/// Passed as a parameter to the minting policy at deployment time.
pub type LazerRwaConfig {
  /// Policy ID of the Pyth deployment on Cardano
  pyth_id: PolicyId,
  /// Pyth Lazer feed ID for the target RWA asset (e.g. 346 = XAU/USD)
  feed_id: Int,
  /// Minimum raw price required to allow minting.
  /// Raw value before applying exponent (e.g. 3000000 = $3000 with exponent -3)
  min_price: Int,
}

/// Minting actions for the RWA token.
pub type MintAction {
  /// Mint new RWA tokens — only allowed if Pyth price >= min_price
  Mint
  /// Burn RWA tokens — always allowed
  Burn
}

/// Minting policy for RWA tokens backed by Pyth Lazer price feeds.
/// The config is applied as a parameter, making each deployment
/// specific to one RWA feed and threshold.
validator lazer_rwa_mint(config: LazerRwaConfig) {
  mint(redeemer: MintAction, _policy_id: PolicyId, self: Transaction) {
    when redeemer is {
      // Burn — always permitted (reduces supply)
      Burn -> True

      // Mint — requires on-chain price verification
      Mint -> {
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

        // Threshold check: price must be at or above minimum to mint
        price >= config.min_price
      }
    }
  }
}
