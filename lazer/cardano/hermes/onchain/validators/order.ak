use aiken/collection/list
use aiken/crypto.{ScriptHash}
use cardano/address.{Address, Script}
use cardano/assets.{PolicyId}
use cardano/transaction.{Input, Output, OutputReference, Transaction}
use hermes_types.{
  Cancel, Fill, Match, OrderDatum, OrderMintRedeemer, OrderRedeemer,
}
use subvalidators/common_checks.{validate_only_burn}
use subvalidators/order_checks.{
  validate_cancel, validate_create_order, validate_fill, validate_match,
}

validator order(market_script_hash: ScriptHash) {
  mint(redeemer: OrderMintRedeemer, policy_id: PolicyId, self: Transaction) {
    when redeemer is {
      OrderMintRedeemer.Mint(seed) ->
        validate_create_order(seed, market_script_hash, policy_id, self)
      OrderMintRedeemer.Burn -> validate_only_burn(policy_id, self)
    }
  }

  spend(
    op_datum: Option<OrderDatum>,
    redeemer: OrderRedeemer,
    utxo: OutputReference,
    self: Transaction,
  ) {
    expect Some(datum) = op_datum

    let Transaction { inputs, .. } = self

    expect Some(Input {
      output: Output {
        address: Address { payment_credential: Script(own_script_hash), .. },
        value: i_val,
        ..
      },
      ..
    }) = list.find(inputs, fn(input) { input.output_reference == utxo })

    when redeemer is {
      Cancel -> validate_cancel(datum, own_script_hash, i_val, self)
      Match -> validate_match(own_script_hash, market_script_hash, self)
      Fill(filled_amount) ->
        validate_fill(
          datum,
          i_val,
          own_script_hash,
          filled_amount,
          market_script_hash,
          self,
        )
    }
  }

  else(_) {
    fail
  }
}
