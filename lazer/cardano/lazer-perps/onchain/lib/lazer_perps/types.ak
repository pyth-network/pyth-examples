use cardano/assets.{PolicyId}

/// Direction of a perpetual position
pub type Direction {
  Long
  Short
}

/// Per-market configuration — applied as parameter at deployment.
/// Deploy once per market: XAU 10x, XAG 10x, XTI 5x, etc.
pub type MarketConfig {
  /// Pyth deployment policy ID on Cardano
  pyth_id: PolicyId,
  /// Pyth Lazer feed ID for this market (e.g. 346 = XAU/USD)
  feed_id: Int,
  /// Maximum leverage for this market (e.g. 10 = 10x)
  leverage_cap: Int,
  /// Minimum collateral in lovelace to open a position
  min_collateral: Int,
  /// Policy ID of the liquidity pool manager
  pool_policy_id: PolicyId,
}

/// A perpetual position stored as datum on an independent eUTxO
pub type Position {
  /// Owner's public key hash
  owner: ByteArray,
  /// Long or Short
  direction: Direction,
  /// Collateral deposited (lovelace)
  collateral: Int,
  /// Position size = collateral * leverage (lovelace-denominated)
  size: Int,
  /// Entry price (raw integer, before exponent)
  entry_price: Int,
  /// Entry price exponent (e.g. -8)
  entry_exponent: Int,
}

/// Pool state stored as datum on the liquidity pool eUTxO
pub type PoolState {
  /// Total open interest across all positions (lovelace)
  total_open_interest: Int,
  /// Maximum allowed open interest (lovelace)
  max_open_interest: Int,
}

/// Liquidation constants
/// Threshold: 80% margin ratio (8000 basis points)
pub const liquidation_bps = 8000

/// Keeper fee: 1% of collateral (100 basis points)
pub const keeper_fee_bps = 100
