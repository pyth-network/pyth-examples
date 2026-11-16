use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{Transaction}

pub fn is_signed_by(tx: Transaction, signer: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, signer)
}
