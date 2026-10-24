use cardano/transaction.{Transaction}

/// Mock Pyth withdrawal validator for testing. Always succeeds.
validator mock_pyth_withdraw {
  withdraw(_redeemer: Data, _account, _self: Transaction) {
    True
  }

  else(_) {
    fail
  }
}
