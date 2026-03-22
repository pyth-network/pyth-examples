use aiken/collection/list
use aiken/math/rational
use cardano/address.{Address, VerificationKey}
use cardano/assets.{PolicyId, lovelace_of}
use cardano/transaction.{Transaction}
use pyth
use types/u32

const ada_usd_feed_id = 16

pub type Action {
  Unlock
  Cancel
}

validator pay_with_pyth(
  usd_amount_cents: Int,
  user_address: Address,
  sponsor_address: Address,
  pyth_id: PolicyId,
) {
  spend(
    _datum: Option<Void>,
    redeemer: Action,
    _own_ref: Data,
    self: Transaction,
  ) {
    // Transaction must be signed by the sponsor
    expect VerificationKey(sponsor_key_hash) =
      sponsor_address.payment_credential
    trace @"sponsor_key_hash": sponsor_key_hash
    trace @"extra_signatories": self.extra_signatories
    expect list.has(self.extra_signatories, sponsor_key_hash)
    trace @"sponsor signature check passed"
    // -----------------------------------------
    when redeemer is {
      Unlock -> {
        expect [update, ..] = pyth.get_updates(pyth_id, self)
        expect Some(feed) =
          list.find(
            update.feeds,
            fn(feed) { u32.as_int(feed.feed_id) == ada_usd_feed_id },
          )
        expect Some(Some(price)) = feed.price
        expect Some(exponent) = feed.exponent
        expect Some(multiplier) =
          rational.from_int(10) |> rational.pow(exponent)
        let ada_usd_price = rational.from_int(price) |> rational.mul(multiplier)
        // Compute the amount of lovelace to be sent to the user
        expect Some(lovelace_needed) =
          rational.from_int(usd_amount_cents * 10_000)
            |> rational.div(ada_usd_price)
        let lovelace_to_user = rational.ceil(lovelace_needed)
        list.any(
          self.outputs,
          fn(output) {
            output.address == user_address && lovelace_of(output.value) >= lovelace_to_user
          },
        )
      }
      // If the action is Cancel, the sponsor can manage the ADA in any way, for example, send it to itself
      Cancel -> {
        trace @"redeemer: Cancel"
        True
      }
    }
  }

  else(_) {
    fail
  }
}
