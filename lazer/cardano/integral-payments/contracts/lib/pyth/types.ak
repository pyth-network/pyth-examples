/// pyth/types.ak
///
/// Core data structures that mirror the Pyth Lazer price-update payload.
///
/// When the off-chain service fetches a signed price update from the Pyth
/// Hermes API it must serialise these fields into Cardano Plutus Data and
/// attach them as part of the transaction redeemer.  The on-chain validator
/// then reads and verifies this data without any trusted intermediary.
///
/// Field layout matches the Pyth Lazer wire format:
///   - feed_id       : 32-byte hex identifier of the price feed
///   - price         : raw integer price (must be combined with exponent)
///   - conf          : confidence interval (same exponent applies)
///   - exponent      : negative integer; real_price = price * 10^exponent
///   - publish_time  : Unix timestamp (seconds) of the Pythnet observation
///   - signature     : 64-byte Ed25519 signature produced by the Pyth signer
///   - signer_key    : 32-byte Ed25519 public key of the authorised signer

/// A single signed price observation delivered by the Pyth oracle.
pub type PriceProof {
  /// 32-byte Pyth feed identifier (e.g. ADA/USD feed id)
  feed_id: ByteArray,
  /// Raw price mantissa — multiply by 10^exponent for the real value
  price: Int,
  /// Confidence interval mantissa — same exponent as `price`
  conf: Int,
  /// Negative power-of-10 scaling factor (e.g. -8 means ×10⁻⁸)
  exponent: Int,
  /// Unix timestamp (seconds) at which Pythnet observed the price
  publish_time: Int,
  /// Ed25519 signature over the canonical message (see `message_bytes`)
  signature: ByteArray,
  /// Ed25519 public key of the Pyth signer that produced `signature`
  signer_key: ByteArray,
}

/// Known Cardano-mainnet Pyth feed identifiers (hex-encoded, 32 bytes each).
/// These constants are embedded at compile-time so the validator can assert
/// that only recognised feeds are accepted for payment.
pub const ada_usd_feed_id: ByteArray =
  #"2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d"

pub const btc_usd_feed_id: ByteArray =
  #"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"

pub const eth_usd_feed_id: ByteArray =
  #"ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"

pub const usdc_usd_feed_id: ByteArray =
  #"eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"

/// Maximum age (in seconds) a price observation may have before the
/// validator rejects it as stale.  Configured at 60 s for the POC;
/// tighten to 30 s or fewer in production.
pub const max_price_age_seconds: Int = 60

/// Lovelace per ADA (1 ADA = 1_000_000 lovelace)
pub const lovelace_per_ada: Int = 1_000_000

/// Basis-points denominator (10_000 bp = 100 %)
pub const bps_denominator: Int = 10_000
