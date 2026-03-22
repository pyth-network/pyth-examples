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
  /// Minimum collateral in micro USDCx to open a position
  min_collateral: Int,
  /// Policy ID of the liquidity pool manager
  pool_policy_id: PolicyId,
}

/// PositionDatum — stored as inline datum on each position eUTxO.
/// Each open position is an independent UTxO with this datum.
pub type PositionDatum {
  /// Pyth Lazer feed ID (e.g. 346 = XAU/USD)
  feed_id: Int,
  /// Long or Short
  direction: Direction,
  /// Leverage multiplier (e.g. 5 = 5x)
  leverage: Int,
  /// Entry price with 6 decimals (e.g. 3285_500000 = $3,285.50)
  entry_price: Int,
  /// Collateral in micro USDCx (e.g. 100_000000 = 100 USDCx)
  collateral: Int,
  /// Trader's public key hash
  trader_pkh: ByteArray,
  /// POSIX timestamp when the position was opened (milliseconds)
  opened_at: Int,
}

/// Pool state stored as datum on the liquidity pool eUTxO
pub type PoolState {
  /// Total open interest across all positions (micro USDCx)
  total_open_interest: Int,
  /// Maximum allowed open interest (micro USDCx)
  max_open_interest: Int,
}

/// Liquidation constants
/// Threshold: 80% margin ratio (8000 basis points)
pub const liquidation_bps = 8000

/// Keeper fee: 1% of collateral (100 basis points)
pub const keeper_fee_bps = 100
