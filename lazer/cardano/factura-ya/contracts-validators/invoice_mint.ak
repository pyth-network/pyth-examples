use aiken/collection/list
use aiken/collection/dict
use aiken/interval.{Finite}
use cardano/address.{Script}
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction, InlineDatum, Output}
use types.{
  InvoiceMintRedeemer, MintInvoice, BurnInvoice,
  InvoiceDatum,
  EscrowDatum, Released, Forfeited,
}

/// Minting policy for invoice NFTs.
///
/// `escrow_script_hash`: the hash of the escrow validator, used to find
/// escrow UTxOs when validating burns.
validator invoice_mint(escrow_script_hash: ByteArray) {
  mint(
    redeemer: InvoiceMintRedeemer,
    policy_id: PolicyId,
    tx: Transaction,
  ) {
    when redeemer is {
      MintInvoice -> validate_mint(policy_id, tx)
      BurnInvoice -> validate_burn(policy_id, escrow_script_hash, tx)
    }
  }

  else(_) {
    fail
  }
}

// --- Mint validation ---

fn validate_mint(policy_id: PolicyId, tx: Transaction) -> Bool {
  // Exactly one token minted under this policy
  let minted = assets.tokens(tx.mint, policy_id)
  expect [Pair(invoice_id, quantity)] = dict.to_pairs(minted)
  expect quantity == 1

  // Find the output carrying the minted NFT with an InvoiceDatum
  let datum = find_invoice_output(tx.outputs, policy_id, invoice_id)

  // Seller must sign the transaction
  expect list.has(tx.extra_signatories, datum.seller)

  // Amount must be positive
  expect datum.amount_ars > 0

  // Due date must be in the future (after tx validity range start)
  let lower_bound = get_validity_start(tx)
  expect datum.due_date_posix_ms > lower_bound

  // Debtor contact hash must not be empty
  expect datum.debtor_contact_hash != #""

  // Invoice ID in datum must match asset name
  expect datum.invoice_id == invoice_id

  True
}

// --- Burn validation ---

fn validate_burn(
  policy_id: PolicyId,
  escrow_script_hash: ByteArray,
  tx: Transaction,
) -> Bool {
  // Exactly one token burned (quantity = -1)
  let minted = assets.tokens(tx.mint, policy_id)
  expect [Pair(invoice_id, quantity)] = dict.to_pairs(minted)
  expect quantity == -1

  // Find the escrow UTxO for this invoice
  let escrow = find_escrow_datum(tx, escrow_script_hash, invoice_id)

  // Escrow must be in a terminal state
  expect escrow.status == Released || escrow.status == Forfeited

  // The NFT holder must sign
  when escrow.buyer is {
    Some(buyer) -> list.has(tx.extra_signatories, buyer)
    None -> list.has(tx.extra_signatories, escrow.seller)
  }
}

// --- Helpers ---

fn find_invoice_output(
  outputs: List<Output>,
  policy_id: PolicyId,
  invoice_id: ByteArray,
) -> InvoiceDatum {
  expect Some(output) =
    list.find(
      outputs,
      fn(o) { assets.quantity_of(o.value, policy_id, invoice_id) == 1 },
    )
  expect InlineDatum(raw) = output.datum
  expect datum: InvoiceDatum = raw
  datum
}

fn find_escrow_datum(
  tx: Transaction,
  escrow_script_hash: ByteArray,
  invoice_id: ByteArray,
) -> EscrowDatum {
  let all_outputs =
    list.concat(
      list.map(tx.reference_inputs, fn(i) { i.output }),
      list.map(tx.inputs, fn(i) { i.output }),
    )
  expect Some(output) =
    list.find(
      all_outputs,
      fn(o) {
        is_escrow_for_invoice(o, escrow_script_hash, invoice_id)
      },
    )
  expect InlineDatum(raw) = output.datum
  expect datum: EscrowDatum = raw
  datum
}

fn is_escrow_for_invoice(
  output: Output,
  escrow_script_hash: ByteArray,
  invoice_id: ByteArray,
) -> Bool {
  when output.address.payment_credential is {
    Script(hash) ->
      if hash == escrow_script_hash {
        when output.datum is {
          InlineDatum(raw) -> {
            expect datum: EscrowDatum = raw
            datum.invoice_id == invoice_id
          }
          _ -> False
        }
      } else {
        False
      }
    _ -> False
  }
}

fn get_validity_start(tx: Transaction) -> Int {
  when tx.validity_range.lower_bound.bound_type is {
    Finite(time) -> time
    _ -> 0
  }
}

