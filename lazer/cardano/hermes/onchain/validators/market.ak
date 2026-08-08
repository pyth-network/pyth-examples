use aiken/collection/list
use cardano/address.{Address, Script}
use cardano/assets.{PolicyId}
use cardano/transaction.{Input, Output, OutputReference, Transaction}
use hermes_types.{
  BurnControlToken, BurnPositionToken, ClaimLosings, ClaimWinnings, CloseMarket,
  MarketDatum, MarketMintRedeemer, MarketRedeemer, MintControlToken,
  MintPositionToken, PosixTime, ProcessMatch, RecordFinalPrice,
}
use subvalidators/common_checks.{validate_only_burn}
use subvalidators/market_checks.{
  validate_claim_losings, validate_claim_winnings, validate_close_market,
  validate_init_market, validate_mint_position_tokens, validate_process_match,
  validate_record_final_price,
}

validator market(start_time: PosixTime, pyth_policy: PolicyId) {
  mint(redeemer: MarketMintRedeemer, policy_id: PolicyId, self: Transaction) {
    when redeemer is {
      MintControlToken ->
        validate_init_market(pyth_policy, start_time, policy_id, self)
      BurnControlToken -> validate_only_burn(policy_id, self)
      MintPositionToken(_dir) -> validate_mint_position_tokens(policy_id, self)
      BurnPositionToken(_dir) -> validate_only_burn(policy_id, self)
    }
  }

  spend(
    op_datum: Option<MarketDatum>,
    redeemer: MarketRedeemer,
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
      RecordFinalPrice ->
        validate_record_final_price(
          pyth_policy,
          start_time,
          own_script_hash,
          datum,
          i_val,
          self,
        )
      ClaimWinnings(claimed_tokens) ->
        validate_claim_winnings(
          i_val,
          claimed_tokens,
          datum,
          own_script_hash,
          self,
        )
      ClaimLosings(claimed_tokens) ->
        validate_claim_losings(
          i_val,
          claimed_tokens,
          datum,
          own_script_hash,
          self,
        )
      CloseMarket -> validate_close_market(own_script_hash, datum, self)
      ProcessMatch ->
        validate_process_match(datum, i_val, own_script_hash, self)
    }
  }

  else(_) {
    fail
  }
}
