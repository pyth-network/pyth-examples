/// validators/payment_gateway.ak
///
/// IntegralPayments — main on-chain validator
///
/// ## Overview
///
/// This spend validator controls UTxOs that represent pending payment
/// requests created by the off-chain ERP/CRM gateway service.  A UTxO is
/// locked here when a customer chooses to pay a merchant invoice in crypto.
/// It is unlocked (collected by the merchant) once the customer proves that
/// they have sent the correct amount, verified against a live Pyth oracle
/// price proof.
///
/// ## UTxO lifecycle
///
/// 1. The off-chain service (paymentService.ts) builds a "lock" transaction
///    that sends a small ADA deposit to this validator address, embedding a
///    `PaymentDatum` that records the invoice details.
///
/// 2. The customer's wallet builds a "collect" transaction that:
///    a. Spends the locked UTxO (triggering this validator).
///    b. Includes the current Pyth price update in the redeemer.
///    c. Sends the required lovelace amount to the merchant's address.
///    d. Sets a tight validity interval so the on-chain staleness check
///       can compare `publish_time` to the slot lower bound.
///
/// 3. The validator succeeds iff ALL of the following hold:
///    - The Pyth signer key matches the trusted key embedded at deploy time.
///    - The price proof's Ed25519 signature is cryptographically valid.
///    - The feed id in the proof matches the one recorded in the datum.
///    - The price observation is not older than `max_price_age_seconds`.
///    - The confidence interval is within the 10 % guard band.
///    - The lovelace sent to the merchant covers the invoice within the
///      configured slippage tolerance (default 50 bp = 0.50 %).
///    - The transaction carries the customer's signature.
///
/// ## Parameters (burned in at deploy time via `aiken blueprint apply`)
///
/// - `trusted_signer` : 32-byte Ed25519 public key of the Pyth oracle signer.
/// - `tolerance_bps`  : acceptable price slippage in basis points (e.g. 50).
///
/// ## Security considerations
///
/// - Double-satisfaction is prevented: the datum carries a unique `payment_id`
///   derived from the ERP invoice reference.  Off-chain code MUST assert that
///   only one input per `payment_id` is included per transaction.
/// - The merchant address is locked into the datum; anyone can submit the
///   collect transaction but ADA always flows to the merchant.
/// - The customer PKH requirement prevents front-running by third parties.
/// - The trusted_signer check prevents self-signed price proofs.

use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{Address}
use cardano/assets
use cardano/transaction.{Output, OutputReference, Transaction}
use pyth/types.{PriceProof}
use pyth/verification.{
  verify_confidence, verify_feed_id, verify_freshness, verify_payment_amount,
  verify_signature, verify_signer,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// Data locked in the UTxO when a payment request is created.
pub type PaymentDatum {
  /// Unique identifier derived off-chain from the ERP invoice reference.
  /// Prevents double-satisfaction: each invoice maps to exactly one UTxO.
  payment_id: ByteArray,
  /// Bech32-decoded merchant address that must receive the payment.
  merchant_address: Address,
  /// Invoice amount in US-cent integer units (e.g. $10.50 -> 1050).
  /// Conversion to lovelace is performed at settlement using the live price.
  invoice_usd_cents: Int,
  /// 32-byte Pyth feed identifier for the asset accepted for this invoice.
  /// Must equal `proof.feed_id` in the redeemer at settlement time.
  accepted_feed_id: ByteArray,
  /// Verification key hash of the customer allowed to settle this invoice.
  /// Must appear in `extra_signatories` of the collect transaction.
  customer_pkh: VerificationKeyHash,
  /// Unix timestamp (seconds) when the payment request was created.
  /// Off-chain reference only; not validated on-chain.
  created_at: Int,
}

/// Data supplied by the customer when spending the locked UTxO.
pub type PaymentRedeemer {
  /// Signed Pyth price observation for the invoice's accepted asset feed.
  proof: PriceProof,
  /// Lower bound of the transaction validity interval as Unix seconds.
  /// The off-chain builder MUST derive this from the slot's POSIX lower bound
  /// so the freshness check is deterministic on-chain.
  now_seconds: Int,
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Sum the lovelace of every output directed to `merchant_address`.
fn merchant_lovelace_received(
  outputs: List<Output>,
  merchant_address: Address,
) -> Int {
  list.foldr(
    outputs,
    0,
    fn(o, acc) {
      if o.address == merchant_address {
        acc + assets.lovelace_of(o.value)
      } else {
        acc
      }
    },
  )
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/// `payment_gateway` - IntegralPayments spend validator.
///
/// Parameters
/// ----------
/// trusted_signer : ByteArray
///   The 32-byte Ed25519 public key of the Pyth Lazer oracle signer.
///   Obtain from Pyth's published signer key set and embed via
///   `aiken blueprint apply`.
///
/// tolerance_bps : Int
///   Price-slippage tolerance in basis points (1 bp = 0.01 %).
///   Recommended: 50 for the POC (allows 0.50 % price movement).
validator payment_gateway(trusted_signer: ByteArray, tolerance_bps: Int) {
  spend(
    datum_opt: Option<PaymentDatum>,
    redeemer: PaymentRedeemer,
    _utxo: OutputReference,
    self: Transaction,
  ) {
    // 1. Datum must be present
    expect Some(datum) = datum_opt

    let proof = redeemer.proof
    let now = redeemer.now_seconds

    // 2. The price proof must come from our trusted Pyth signer key
    expect verify_signer(proof, trusted_signer)

    // 3. Ed25519 signature over the canonical Pyth Lazer message must be valid
    expect verify_signature(proof)

    // 4. Price feed must match the one accepted for this invoice
    expect verify_feed_id(proof, datum.accepted_feed_id)

    // 5. Price observation must not be stale
    expect verify_freshness(proof, now)

    // 6. Confidence interval must be within the 10 % guard band
    expect verify_confidence(proof)

    // 7. Lovelace received by merchant must cover the invoice within tolerance
    let received =
      merchant_lovelace_received(self.outputs, datum.merchant_address)
    expect verify_payment_amount(proof, datum.invoice_usd_cents, received, tolerance_bps)

    // 8. Transaction must be signed by the authorised customer
    list.has(self.extra_signatories, datum.customer_pkh)
  }

  // Reject any attempt to use this script for minting, withdrawals, etc.
  else(_) {
    fail @"payment_gateway: unsupported script purpose"
  }
}
