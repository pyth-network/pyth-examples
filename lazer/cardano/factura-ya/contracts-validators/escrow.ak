use aiken/collection/list
use aiken/interval.{Finite}
use cardano/address.{VerificationKey}
use cardano/assets
use cardano/transaction.{Transaction, InlineDatum, OutputReference}
use types.{
  EscrowDatum, EscrowRedeemer,
  Locked, Released, Forfeited,
  Release, Forfeit,
}

/// Grace period after due date before forfeit is allowed (7 days in ms).
pub const grace_period_ms: Int = 7 * 24 * 60 * 60 * 1000

/// Minimum collateral percentage (basis points). 1000 = 10%.
pub const min_collateral_bps: Int = 1000

validator escrow {
  spend(
    datum: Option<EscrowDatum>,
    redeemer: EscrowRedeemer,
    _utxo: OutputReference,
    tx: Transaction,
  ) {
    expect Some(d) = datum
    when redeemer is {
      Release -> validate_release(d, tx)
      Forfeit -> validate_forfeit(d, tx)
    }
  }

  else(_) {
    fail
  }
}

// --- Release: buyer confirms payment received, collateral goes back to seller ---

fn validate_release(datum: EscrowDatum, tx: Transaction) -> Bool {
  expect datum.status == Locked
  expect Some(buyer) = datum.buyer
  expect list.has(tx.extra_signatories, buyer)

  let lower = get_validity_start(tx)
  expect lower >= datum.due_date_posix_ms

  expect pays_to_pkh(tx, datum.seller, datum.collateral_lovelace)

  True
}

// --- Forfeit: buyer reports non-payment, collateral goes to buyer ---

fn validate_forfeit(datum: EscrowDatum, tx: Transaction) -> Bool {
  expect datum.status == Locked
  expect Some(buyer) = datum.buyer
  expect list.has(tx.extra_signatories, buyer)

  let lower = get_validity_start(tx)
  expect lower >= datum.due_date_posix_ms + grace_period_ms

  expect pays_to_pkh(tx, buyer, datum.collateral_lovelace)

  True
}

// --- Helpers ---

fn get_validity_start(tx: Transaction) -> Int {
  when tx.validity_range.lower_bound.bound_type is {
    Finite(time) -> time
    _ -> 0
  }
}

// --- Tests ---

test grace_period_is_7_days() {
  grace_period_ms == 7 * 24 * 60 * 60 * 1000
}

test min_collateral_is_10_percent() {
  min_collateral_bps == 1000
}

// --- Helpers ---

fn pays_to_pkh(
  tx: Transaction,
  pkh: ByteArray,
  min_lovelace: Int,
) -> Bool {
  list.any(
    tx.outputs,
    fn(o) {
      when o.address.payment_credential is {
        VerificationKey(hash) ->
          hash == pkh && assets.lovelace_of(o.value) >= min_lovelace
        _ -> False
      }
    },
  )
}
