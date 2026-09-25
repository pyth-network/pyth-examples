/// pyth/verification.ak
///
/// On-chain verification helpers for Pyth Lazer price proofs.
///
/// ## Verification strategy
///
/// Pyth Lazer signs a canonical byte-message with an Ed25519 key.  The
/// message is constructed as:
///
///   message = feed_id          (32 bytes)
///          || price_bytes      ( 8 bytes, big-endian int64)
///          || conf_bytes       ( 8 bytes, big-endian int64)
///          || exponent_bytes   ( 4 bytes, big-endian int32)
///          || publish_time_bytes (8 bytes, big-endian int64)
///
/// The validator calls `builtin.verify_ed25519_signature` (a Plutus V3
/// native builtin) to confirm the signature without any off-chain trust.
///
/// ## Important notes for auditors
///
/// 1. The `signer_key` in the proof must match the `trusted_signer` parameter
///    embedded in the validator at deployment time.  This prevents an attacker
///    from supplying a self-signed price proof.
///
/// 2. `publish_time` is compared against `tx_valid_range` lower bound so the
///    validator rejects proofs whose timestamp is outside the current slot
///    window.  Off-chain code MUST set a tight validity interval.
///
/// 3. The confidence interval check (`conf <= price / 10`) is a basic sanity
///    guard; tighten or remove it according to the risk tolerance of the
///    deployment.

use aiken/builtin
use aiken/math
use pyth/types.{
  PriceProof,
  bps_denominator,
  lovelace_per_ada,
  max_price_age_seconds,
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Serialise a 64-bit big-endian integer into 8 bytes.
/// Aiken's `builtin.integer_to_bytearray` encodes in little-endian, so we
/// reverse the output.
fn int64_to_bytes(n: Int) -> ByteArray {
  let le = builtin.integer_to_bytearray(True, 8, n)
  builtin.bytearray_to_integer(False, le)
    |> builtin.integer_to_bytearray(False, 8, _)
}

/// Serialise a 32-bit big-endian integer into 4 bytes.
fn int32_to_bytes(n: Int) -> ByteArray {
  let le = builtin.integer_to_bytearray(True, 4, n)
  builtin.bytearray_to_integer(False, le)
    |> builtin.integer_to_bytearray(False, 4, _)
}

/// Build the canonical Pyth Lazer message that was signed.
///
/// Layout (60 bytes total):
///   [0..31]  feed_id        (32 bytes)
///   [32..39] price          ( 8 bytes, big-endian int64)
///   [40..47] conf           ( 8 bytes, big-endian int64)
///   [48..51] exponent       ( 4 bytes, big-endian int32)
///   [52..59] publish_time   ( 8 bytes, big-endian int64)
pub fn build_message(proof: PriceProof) -> ByteArray {
  proof.feed_id
    |> builtin.append_bytearray(int64_to_bytes(proof.price), _)
    |> builtin.append_bytearray(int64_to_bytes(proof.conf), _)
    |> builtin.append_bytearray(int32_to_bytes(proof.exponent), _)
    |> builtin.append_bytearray(int64_to_bytes(proof.publish_time), _)
}

// ---------------------------------------------------------------------------
// Public verification API
// ---------------------------------------------------------------------------

/// Verify that the Ed25519 signature in `proof` is valid for the canonical
/// Pyth Lazer message, signed with `proof.signer_key`.
///
/// Returns `True` iff the cryptographic check passes.
pub fn verify_signature(proof: PriceProof) -> Bool {
  let msg = build_message(proof)
  builtin.verify_ed25519_signature(proof.signer_key, msg, proof.signature)
}

/// Assert that `proof.signer_key` matches the `trusted_signer` key that was
/// burned into the validator at deployment time.
///
/// This guards against self-signed proofs: an attacker could otherwise
/// generate a valid Ed25519 signature with their own key and supply a
/// fabricated price.
pub fn verify_signer(proof: PriceProof, trusted_signer: ByteArray) -> Bool {
  proof.signer_key == trusted_signer
}

/// Assert that the price feed targeted by `proof.feed_id` matches the
/// `expected_feed_id` configured on the payment UTxO datum.
pub fn verify_feed_id(proof: PriceProof, expected_feed_id: ByteArray) -> Bool {
  proof.feed_id == expected_feed_id
}

/// Assert that `proof.publish_time` is not older than `max_price_age_seconds`
/// relative to the current slot's lower bound (passed in as `now_seconds`).
///
/// The off-chain service must derive `now_seconds` from the transaction
/// validity interval lower bound so this check is deterministic on-chain.
pub fn verify_freshness(proof: PriceProof, now_seconds: Int) -> Bool {
  let age = now_seconds - proof.publish_time
  age >= 0 && age <= max_price_age_seconds
}

/// Sanity check: confidence interval must not exceed 10 % of the price.
/// A wide confidence interval signals low liquidity or a market disruption
/// and should block payment acceptance.
pub fn verify_confidence(proof: PriceProof) -> Bool {
  // conf <= price / 10  ↔  conf * 10 <= price
  proof.conf * 10 <= proof.price
}

/// Compute how many lovelace are required to settle `invoice_usd_cents`
/// (an integer number of US-cent units, e.g. $12.50 = 1250) at the price
/// contained in `proof`.
///
/// Formula:
///   lovelace = invoice_usd_cents
///              × lovelace_per_ada
///              × 10^(-exponent)      ← undo the Pyth price exponent
///              ÷ (price × 100)       ← price is per ADA, cents need ÷100
///
/// Since `exponent` is negative (e.g. -8), `10^(-exponent)` is a large
/// integer (10^8) — we avoid floating point entirely.
///
/// Example:
///   proof.price    = 35_000_000   (= $0.35000000 with exponent -8)
///   proof.exponent = -8
///   invoice        = 1000 cents   (= $10.00)
///
///   scale          = 10^8         = 100_000_000
///   lovelace       = 1000 × 1_000_000 × 100_000_000
///                    ÷ (35_000_000 × 100)
///                  = 100_000_000_000_000 ÷ 3_500_000_000
///                  ≈ 28_571_428   (≈ 28.57 ADA)
pub fn compute_required_lovelace(
  proof: PriceProof,
  invoice_usd_cents: Int,
) -> Int {
  // exponent is negative; negate it to get the positive scaling power
  let scale = math.pow(10, 0 - proof.exponent)
  invoice_usd_cents * lovelace_per_ada * scale / (proof.price * 100)
}

/// Verify that `paid_lovelace` satisfies the invoice for `invoice_usd_cents`
/// at the oracle price, within `tolerance_bps` basis points of slippage.
///
/// The tolerance window is expressed in basis points (1 bp = 0.01 %).
/// A value of 50 allows up to 0.50 % price movement between the moment the
/// off-chain service fetches the price and the moment the transaction lands.
///
/// Returns `True` iff:
///   paid_lovelace  ≥  required × (bps_denominator - tolerance_bps)
///                      ÷  bps_denominator
///
/// i.e. the merchant accepts a small shortfall due to price movement but
/// never accepts less than (1 - tolerance) × expected.
pub fn verify_payment_amount(
  proof: PriceProof,
  invoice_usd_cents: Int,
  paid_lovelace: Int,
  tolerance_bps: Int,
) -> Bool {
  let required = compute_required_lovelace(proof, invoice_usd_cents)
  // lower_bound = required * (10_000 - tolerance_bps) / 10_000
  let lower_bound =
    required * (bps_denominator - tolerance_bps) / bps_denominator
  paid_lovelace >= lower_bound
}
