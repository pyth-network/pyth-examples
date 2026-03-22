use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction}
use cardano/transaction as tx

/// Pool de liquidez demo: solo el `owner` firmante puede mover fondos del script.
/// Cualquiera puede **enviar** ADA a la dirección del script (depósitos desde wallet).
pub type PoolDatum {
  owner: VerificationKeyHash,
}

fn owner_signed(self: Transaction, who: VerificationKeyHash) -> Bool {
  list.any(self.extra_signatories, fn(k) { k == who })
}

validator liquidity_pool {
  spend(
    datum: Option<PoolDatum>,
    _redeemer: Data,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(d) = datum
    owner_signed(self, d.owner)?
  }
}
