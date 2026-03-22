use cardano/assets.{PolicyId}

/// Direction of a perpetual position
pub type Direction {
  Long
  Short
}

/// Protocol configuration — applied as parameter at deployment
pub type PerpsConfig {
  /// Pyth deployment policy ID on Cardano
  pyth_id: PolicyId,
  /// Maximum leverage allowed (e.g. 10 = 10x)
  max_leverage: Int,
  /// Liquidation threshold in basis points (e.g. 8000 = 80%)
  liquidation_bps: Int,
}

/// A perpetual position stored as datum on a eUTxO
pub type Position {
  /// Owner's public key hash
  owner: ByteArray,
  /// Pyth feed ID for the traded asset
  feed_id: Int,
  /// Long or Short
  direction: Direction,
  /// Collateral amount in lovelace
  collateral: Int,
  /// Position size (collateral * leverage)
  size: Int,
  /// Entry price (raw, before exponent)
  entry_price: Int,
  /// Entry price exponent
  entry_exponent: Int,
}
