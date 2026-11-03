use aiken/collection/list
use aiken/crypto.{VerificationKeyHash, blake2b_256}
use aiken/math
use cardano/address
use cardano/assets.{AssetName, PolicyId}
use cardano/transaction.{OutputReference, Transaction}
use pyth
use types/u32

pub const ada_usd_feed_id = 16

pub type InvoiceDatum {
  InvoiceDatum {
    seller: VerificationKeyHash,
    usd_amount_cents: Int,
    pyth_policy_id: PolicyId,
    pin_hash: ByteArray,
    invoice_nft_policy_id: PolicyId,
    invoice_nft_name: AssetName,
    deadline: Int,
  }
}

pub type InvoiceRedeemer {
  Pay { buyer: VerificationKeyHash, pin: ByteArray }
}

pub fn minimum_lovelace_required(
  usd_amount_cents: Int,
  ada_usd_price: Int,
  exponent: Int,
) -> Int {
  let scale = math.pow(10, 0 - exponent)
  let numerator = usd_amount_cents * 1_000_000 * scale
  let denominator = ada_usd_price * 100
  ( numerator + denominator - 1 ) / denominator
}

pub fn read_ada_usd_quote(
  pyth_policy_id: PolicyId,
  tx: Transaction,
) -> (Int, Int) {
  expect [update] = pyth.get_updates(pyth_policy_id, tx)

  expect Some(feed) =
    list.find(
      update.feeds,
      fn(feed) { u32.as_int(feed.feed_id) == ada_usd_feed_id },
    )

  expect Some(Some(price)) = feed.price
  expect Some(exponent) = feed.exponent
  (price, exponent)
}

pub fn pays_seller_at_least(
  seller: VerificationKeyHash,
  minimum_lovelace: Int,
  tx: Transaction,
) -> Bool {
  let seller_address = address.from_verification_key(seller)

  list.any(
    tx.outputs,
    fn(output) {
      output.address == seller_address && assets.lovelace_of(output.value) >= minimum_lovelace
    },
  )
}

pub fn sends_invoice_nft_to_buyer(
  buyer: VerificationKeyHash,
  invoice_nft_policy_id: PolicyId,
  invoice_nft_name: AssetName,
  tx: Transaction,
) -> Bool {
  let buyer_address = address.from_verification_key(buyer)

  list.any(
    tx.outputs,
    fn(output) {
      output.address == buyer_address && assets.has_nft(
        output.value,
        invoice_nft_policy_id,
        invoice_nft_name,
      )
    },
  )
}

validator invoice {
  spend(
    datum: Option<InvoiceDatum>,
    redeemer: InvoiceRedeemer,
    _own_ref: OutputReference,
    tx: Transaction,
  ) {
    expect Some(datum) = datum
    let Pay { buyer, pin } = redeemer

    let (price, exponent) = read_ada_usd_quote(datum.pyth_policy_id, tx)
    let min_lovelace =
      minimum_lovelace_required(datum.usd_amount_cents, price, exponent)

    and {
      blake2b_256(pin) == datum.pin_hash,
      pays_seller_at_least(datum.seller, min_lovelace, tx),
      sends_invoice_nft_to_buyer(
        buyer,
        datum.invoice_nft_policy_id,
        datum.invoice_nft_name,
        tx,
      ),
    }
  }

  else(_) {
    fail
  }
}
