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
        trace @"redeemer: Unlock"
        let updates = pyth.get_updates(pyth_id, self)
        trace @"pyth updates count": list.length(updates)
        expect [update] = updates
        trace @"feeds count": list.length(update.feeds)
        let feed_opt =
          list.find(
            update.feeds,
            fn(feed) { u32.as_int(feed.feed_id) == ada_usd_feed_id },
          )
        trace @"feed found": feed_opt
        expect Some(feed) = feed_opt
        trace @"feed.price": feed.price
        trace @"feed.exponent": feed.exponent
        expect Some(Some(price)) = feed.price
        expect Some(exponent) = feed.exponent
        trace @"price": price
        trace @"exponent": exponent
        let multiplier_opt = rational.from_int(10) |> rational.pow(exponent)
        trace @"multiplier": multiplier_opt
        expect Some(multiplier) = multiplier_opt
        let ada_usd_price = rational.from_int(price) |> rational.mul(multiplier)
        trace @"ada_usd_price numerator": rational.numerator(ada_usd_price)
        trace @"ada_usd_price denominator": rational.denominator(ada_usd_price)
        // Compute the amount of lovelace to be sent to the user
        let lovelace_needed_opt =
          rational.from_int(usd_amount_cents * 10_000)
            |> rational.div(ada_usd_price)
        trace @"lovelace_needed": lovelace_needed_opt
        expect Some(lovelace_needed) = lovelace_needed_opt
        let lovelace_to_user = rational.ceil(lovelace_needed)
        trace @"lovelace_to_user": lovelace_to_user
        trace @"user_address": user_address
        let result =
          list.any(
            self.outputs,
            fn(output) {
              output.address == user_address && lovelace_of(output.value) >= lovelace_to_user
            },
          )
        trace @"output check result": result
        result
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
