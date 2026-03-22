/// Simplified minting policy for the hackathon demo.
///
/// This validator only checks:
/// 1. Exactly one token is minted or burned
/// 2. The seller (any signer) authorizes the transaction
///
/// The full validator (invoice_mint.ak) additionally validates:
/// - InvoiceDatum in the output matches the asset name
/// - amount_usd > 0
/// - due_date in the future
/// - debtor_contact_hash is non-empty
/// - Escrow state for burns
///
/// See custom_docs/demo-validator-decision.md for rationale.

use aiken/collection/list
use aiken/collection/dict
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}

validator invoice_mint_demo {
  mint(
    _redeemer: Data,
    policy_id: PolicyId,
    tx: Transaction,
  ) {
    // Exactly one token minted or burned under this policy
    let minted = assets.tokens(tx.mint, policy_id)
    expect [Pair(_asset_name, quantity)] = dict.to_pairs(minted)
    expect quantity == 1 || quantity == -1

    // At least one signer (the seller)
    expect [_, ..] = tx.extra_signatories

    True
  }

  else(_) {
    fail
  }
}
