use cardano/transaction.{Transaction}
use aiken/interval.{Finite}

// Agregamos 'pub' para que no haya "leak"
pub type Datum {
  owner: ByteArray,
  lock_until: Int,
}

// También el Redeemer debe ser público
pub type Redeemer {
  Cancel
  Confirm
}

validator peg_defense {
  spend(datum: Option<Datum>, redeemer: Redeemer, _utxo: Data, self: Transaction) {
    // 1. Verificamos que el Datum exista
    expect Some(d) = datum
    
    // 2. Accedemos al tiempo directamente
    expect Finite(current_time) = self.validity_range.lower_bound.bound_type

    when redeemer is {
      // Regla de Reversibilidad (30s): Solo si el tiempo actual es menor al límite
      Cancel -> 
        current_time <= d.lock_until
      
      // Regla de Confirmación: Solo si el tiempo ya pasó
      Confirm -> 
        current_time > d.lock_until
    }
  }
}