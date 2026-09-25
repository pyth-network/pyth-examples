use aiken/crypto.{VerificationKeyHash}
use cardano/assets.{PolicyId}
use cardano/transaction.{OutputReference, Transaction}

pub type MintInvoiceRedeemer {
  MintInvoice { seller: VerificationKeyHash, invoice_ref: OutputReference }
}

validator mint_invoice_nft {
  mint(_redeemer: MintInvoiceRedeemer, _policy_id: PolicyId, _tx: Transaction) {
    True
  }

  else(_) {
    fail
  }
}
