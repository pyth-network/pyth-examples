/// validators/tests/payment_gateway_tests.ak
///
/// Unit tests for the IntegralPayments validator and Pyth verification
/// library.  Run with:
///
///   cd contracts && aiken check
///
/// Tests are organised in three groups:
///   1. pyth/verification helpers (unit-level)
///   2. payment_gateway validator happy paths
///   3. payment_gateway validator failure / attack paths

use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{Address, Inline, VerificationKey}
use cardano/assets
use cardano/transaction.{
  NoDatum, Output, OutputReference, Transaction, TransactionId,
}
use pyth/types.{
  PriceProof, ada_usd_feed_id, bps_denominator, lovelace_per_ada,
  max_price_age_seconds,
}
use pyth/verification.{
  build_message, compute_required_lovelace, verify_confidence, verify_feed_id,
  verify_freshness, verify_payment_amount, verify_signer,
}

// ============================================================================
// Test fixtures
// ============================================================================

/// A synthetic Pyth Ed25519 signing key pair.
/// In a real test setup you would generate these with `aiken key-gen` or
/// derive them deterministically from a known seed.
/// NOTE: Do NOT use these keys on mainnet.
const test_signer_key: ByteArray =
  #"d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"

const test_signer_secret: ByteArray =
  #"9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae3d55"

/// ADA/USD price feed id (real mainnet value).
const feed_id: ByteArray = ada_usd_feed_id

/// Synthetic price: ADA = $0.35000000  (exponent = -8)
const price_mantissa: Int = 35_000_000

const price_exponent: Int = -8

const price_conf: Int = 175_000

/// Unix timestamp used as "now" in freshness tests.
const now_ts: Int = 1_700_000_000

/// A publish_time 30 seconds before "now" — within the freshness window.
const fresh_ts: Int = now_ts - 30

/// A publish_time 90 seconds before "now" — outside the freshness window.
const stale_ts: Int = now_ts - 90

/// Invoice: $10.00 = 1000 US cents.
const invoice_cents: Int = 1000

/// Tolerance: 50 bp = 0.50 %.
const tolerance_bps: Int = 50

/// Merchant address (synthetic payment-only address).
const merchant_pkh: ByteArray =
  #"abcdef0123456789abcdef0123456789abcdef0123456789abcdef01"

/// Customer verification key hash.
const customer_pkh: VerificationKeyHash =
  #"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn make_merchant_address() -> Address {
  Address {
    payment_credential: VerificationKey(merchant_pkh),
    staking_credential: None,
  }
}

/// Build a minimal PriceProof.  The `signature` field is set to 64 zero bytes
/// for tests that do NOT check the Ed25519 signature (the crypto builtin would
/// require a real signed message).
fn make_proof(
  p: Int,
  c: Int,
  exp: Int,
  ts: Int,
  fid: ByteArray,
) -> PriceProof {
  PriceProof {
    feed_id: fid,
    price: p,
    conf: c,
    exponent: exp,
    publish_time: ts,
    // 64 zero bytes — valid placeholder for non-signature tests
    signature: #"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    signer_key: test_signer_key,
  }
}

fn standard_proof() -> PriceProof {
  make_proof(price_mantissa, price_conf, price_exponent, fresh_ts, feed_id)
}

/// Build a minimal Output sending `lovelace` to the merchant.
fn merchant_output(lovelace: Int) -> Output {
  Output {
    address: make_merchant_address(),
    value: assets.from_lovelace(lovelace),
    datum: NoDatum,
    reference_script: None,
  }
}

// ============================================================================
// Group 1 — pyth/verification helpers
// ============================================================================

test verify_signer_matches() {
  let proof = standard_proof()
  verify_signer(proof, test_signer_key)
}

test verify_signer_rejects_wrong_key() {
  let proof = standard_proof()
  let wrong_key =
    #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  !verify_signer(proof, wrong_key)
}

test verify_feed_id_matches() {
  let proof = standard_proof()
  verify_feed_id(proof, ada_usd_feed_id)
}

test verify_feed_id_rejects_wrong_feed() {
  let proof = standard_proof()
  let btc_feed =
    #"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
  !verify_feed_id(proof, btc_feed)
}

test verify_freshness_within_window() {
  let proof = standard_proof()
  verify_freshness(proof, now_ts)
}

test verify_freshness_rejects_stale_price() {
  let proof = make_proof(price_mantissa, price_conf, price_exponent, stale_ts, feed_id)
  !verify_freshness(proof, now_ts)
}

test verify_freshness_rejects_future_timestamp() {
  // publish_time > now_seconds is suspicious — age would be negative
  let future_ts = now_ts + 10
  let proof = make_proof(price_mantissa, price_conf, price_exponent, future_ts, feed_id)
  !verify_freshness(proof, now_ts)
}

test verify_confidence_passes_tight_spread() {
  // conf = 1 % of price — well within 10 %
  let proof = make_proof(price_mantissa, price_mantissa / 100, price_exponent, fresh_ts, feed_id)
  verify_confidence(proof)
}

test verify_confidence_passes_at_exactly_10pct() {
  // conf = exactly 10 % of price → conf * 10 = price → passes
  let proof = make_proof(price_mantissa, price_mantissa / 10, price_exponent, fresh_ts, feed_id)
  verify_confidence(proof)
}

test verify_confidence_rejects_wide_spread() {
  // conf = 15 % of price → conf * 10 > price → fails
  let conf15pct = price_mantissa * 15 / 100
  let proof = make_proof(price_mantissa, conf15pct, price_exponent, fresh_ts, feed_id)
  !verify_confidence(proof)
}

// ============================================================================
// Group 2 — compute_required_lovelace
// ============================================================================

test compute_lovelace_ada_usd() {
  // ADA = $0.35 (price 35_000_000, exp -8)
  // Invoice = $10.00 (1000 cents)
  // Expected: 1000 * 1_000_000 * 10^8 / (35_000_000 * 100)
  //         = 100_000_000_000_000 / 3_500_000_000
  //         = 28_571_428 lovelace (≈ 28.57 ADA)
  let proof = standard_proof()
  let result = compute_required_lovelace(proof, invoice_cents)
  // Allow ±1 lovelace for integer division rounding
  result >= 28_571_427 && result <= 28_571_429
}

test compute_lovelace_higher_ada_price() {
  // ADA = $1.00 (price 100_000_000, exp -8)
  // Invoice = $10.00 → expect 10 ADA = 10_000_000 lovelace
  let proof = make_proof(100_000_000, 1_000_000, price_exponent, fresh_ts, feed_id)
  let result = compute_required_lovelace(proof, invoice_cents)
  result >= 9_999_999 && result <= 10_000_001
}

// ============================================================================
// Group 3 — verify_payment_amount
// ============================================================================

test payment_amount_exact_passes() {
  let proof = standard_proof()
  let required = compute_required_lovelace(proof, invoice_cents)
  verify_payment_amount(proof, invoice_cents, required, tolerance_bps)
}

test payment_amount_overpayment_passes() {
  let proof = standard_proof()
  let required = compute_required_lovelace(proof, invoice_cents)
  // 5 % over — should always pass
  verify_payment_amount(proof, invoice_cents, required * 105 / 100, tolerance_bps)
}

test payment_amount_within_tolerance_passes() {
  let proof = standard_proof()
  let required = compute_required_lovelace(proof, invoice_cents)
  // 0.40 % under — within 50 bp tolerance
  let slightly_under = required * 9960 / 10000
  verify_payment_amount(proof, invoice_cents, slightly_under, tolerance_bps)
}

test payment_amount_beyond_tolerance_fails() {
  let proof = standard_proof()
  let required = compute_required_lovelace(proof, invoice_cents)
  // 1 % under — beyond 50 bp tolerance
  let too_little = required * 9900 / 10000
  !verify_payment_amount(proof, invoice_cents, too_little, tolerance_bps)
}

test payment_amount_zero_fails() {
  let proof = standard_proof()
  !verify_payment_amount(proof, invoice_cents, 0, tolerance_bps)
}

// ============================================================================
// Group 4 — build_message determinism
// ============================================================================

test build_message_is_deterministic() {
  let proof = standard_proof()
  build_message(proof) == build_message(proof)
}

test build_message_differs_on_price_change() {
  let proof1 = standard_proof()
  let proof2 = make_proof(price_mantissa + 1, price_conf, price_exponent, fresh_ts, feed_id)
  build_message(proof1) != build_message(proof2)
}

test build_message_differs_on_timestamp_change() {
  let proof1 = standard_proof()
  let proof2 = make_proof(price_mantissa, price_conf, price_exponent, fresh_ts + 1, feed_id)
  build_message(proof1) != build_message(proof2)
}
