/// Datum variants for the oracle validator.
/// Constructor indices must match the off-chain encoder in tx_builder.ts.
pub type OracleDatum {
  /// Accept any price — just verify the Pyth update is fresh.
  AnyPrice
  /// Require price >= min_price_usd_cents.
  MinPrice { min_price_usd_cents: Int }
  /// Require price <= max_price_usd_cents.
  MaxPrice { max_price_usd_cents: Int }
  /// Require lo_cents <= price <= hi_cents.
  PriceRange { lo_cents: Int, hi_cents: Int }
}
