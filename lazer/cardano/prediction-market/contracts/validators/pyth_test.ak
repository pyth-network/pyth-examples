use aiken/collection/list
use cardano/address.{Credential}
use cardano/assets.{PolicyId}
use cardano/certificate.{Certificate, RegisterCredential}
use cardano/transaction.{Transaction}
use pyth
use types/u32

/// Minimal test validator to verify Pyth Lazer integration works.
/// Parameterized with the Pyth deployment policy ID.
/// Calls pyth.get_updates() and asserts BTC/USD price exists.
validator pyth_test(pyth_id: PolicyId) {
  withdraw(_redeemer: Data, _account: Credential, self: Transaction) {
    // Get verified price updates from Pyth
    expect [update] = pyth.get_updates(pyth_id, self)

    // Find BTC/USD feed (id = 1)
    expect Some(btc_feed) =
      list.find(update.feeds, fn(f) { u32.as_int(f.feed_id) == 1 })

    // Assert price exists
    expect Some(Some(_price)) = btc_feed.price

    True
  }

  publish(_redeemer: Data, certificate: Certificate, _self: Transaction) {
    when certificate is {
      RegisterCredential { .. } -> True
      _ -> fail
    }
  }

  else(_) {
    fail
  }
}
