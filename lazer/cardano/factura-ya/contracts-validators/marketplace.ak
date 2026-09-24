use aiken/collection/list
use aiken/collection/dict
use cardano/address.{VerificationKey, Script}
use cardano/assets
use cardano/transaction.{Transaction, InlineDatum, OutputReference, Output}
use types.{
  ListingDatum, MarketplaceRedeemer, ListingStatus,
  Listed, Sold, Delisted,
  Purchase, Delist,
  EscrowDatum, Locked,
}

/// Marketplace validator for listing, purchasing, and delisting invoice NFTs.
///
/// `invoice_policy_id`: the minting policy ID for invoice NFTs.
/// `escrow_script_hash`: the escrow validator hash (to find and update escrow UTxOs).
validator marketplace(
  invoice_policy_id: ByteArray,
  escrow_script_hash: ByteArray,
) {
  spend(
    datum: Option<ListingDatum>,
    redeemer: MarketplaceRedeemer,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    expect Some(d) = datum
    when redeemer is {
      Purchase -> validate_purchase(d, invoice_policy_id, escrow_script_hash, tx)
      Delist -> validate_delist(d, invoice_policy_id, tx)
    }
  }

  else(_) {
    fail
  }
}

// --- Purchase: investor buys the invoice NFT ---

fn validate_purchase(
  listing: ListingDatum,
  invoice_policy_id: ByteArray,
  escrow_script_hash: ByteArray,
  tx: Transaction,
) -> Bool {
  // Must be currently listed
  expect listing.status == Listed

  // Payment to seller must be >= asking price
  expect
    pays_to_pkh(tx, listing.seller, listing.asking_price_lovelace)

  // NFT must go to the buyer (someone who signed the tx, not the seller)
  expect Some(buyer_pkh) =
    list.find(
      tx.extra_signatories,
      fn(sig) { sig != listing.seller },
    )

  expect
    nft_goes_to_pkh(tx, invoice_policy_id, listing.invoice_id, buyer_pkh)

  // Escrow must be updated with the buyer's identity.
  // We check that an output to the escrow script exists with matching
  // invoice_id and buyer set to Some(buyer_pkh).
  expect
    escrow_output_has_buyer(
      tx, escrow_script_hash, listing.invoice_id, buyer_pkh,
    )

  True
}

// --- Delist: seller withdraws the listing ---

fn validate_delist(
  listing: ListingDatum,
  invoice_policy_id: ByteArray,
  tx: Transaction,
) -> Bool {
  // Must be currently listed
  expect listing.status == Listed

  // Seller must sign
  expect list.has(tx.extra_signatories, listing.seller)

  // NFT must be returned to seller
  expect
    nft_goes_to_pkh(tx, invoice_policy_id, listing.invoice_id, listing.seller)

  True
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

fn nft_goes_to_pkh(
  tx: Transaction,
  policy_id: ByteArray,
  asset_name: ByteArray,
  pkh: ByteArray,
) -> Bool {
  list.any(
    tx.outputs,
    fn(o) {
      when o.address.payment_credential is {
        VerificationKey(hash) ->
          hash == pkh && assets.quantity_of(o.value, policy_id, asset_name) == 1
        _ -> False
      }
    },
  )
}

fn escrow_output_has_buyer(
  tx: Transaction,
  escrow_script_hash: ByteArray,
  invoice_id: ByteArray,
  buyer_pkh: ByteArray,
) -> Bool {
  list.any(
    tx.outputs,
    fn(o) {
      when o.address.payment_credential is {
        Script(hash) ->
          if hash == escrow_script_hash {
            when o.datum is {
              InlineDatum(raw) -> {
                expect datum: EscrowDatum = raw
                datum.invoice_id == invoice_id && datum.buyer == Some(
                  buyer_pkh,
                ) && datum.status == Locked
              }
              _ -> False
            }
          } else {
            False
          }
        _ -> False
      }
    },
  )
}
