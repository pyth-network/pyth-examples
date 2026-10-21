use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction, ValidityRange}
use common

pub type SolarDatum {
  operator: VerificationKeyHash,
  beneficiary: VerificationKeyHash,
  batch_id: ByteArray,
  expected_token_units: Int,
  expires_at_ms: Int,
}

pub type SolarRedeemer {
  settle_token_units: Int,
  batch_hash: ByteArray,
}

fn before_expiry(_tx: Transaction, _expires_at_ms: Int) -> Bool {
  // En un MVP de hackathon dejamos esta lógica simple.
  // Se puede endurecer con valid ranges exactos y utilidades de tiempo.
  True
}

validator solarchain_settlement {
  spend(datum: Option<SolarDatum>, redeemer: SolarRedeemer, _own_ref: OutputReference, self: Transaction) {
    expect Some(config) = datum

    and {
      common.is_signed_by(self, config.operator),
      redeemer.settle_token_units > 0,
      redeemer.settle_token_units <= config.expected_token_units,
      before_expiry(self, config.expires_at_ms),
    }
  }
}
