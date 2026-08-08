use aiken/cbor
use aiken/collection/dict.{to_pairs}
use aiken/collection/list as list
use aiken/crypto.{ScriptHash, blake2b_256}
use cardano/address.{Address, Script, VerificationKey}
use cardano/assets.{
  PolicyId, Value, add, from_asset, from_lovelace, match, merge, negate,
  quantity_of, tokens,
}
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction,
}
use contants.{down_tn, up_tn}
use hermes_types.{Buy, Direction, Down, Operation, OrderDatum, Price, Sell, Up}

pub fn validate_create_order(
  seed: OutputReference,
  position_token_policy: PolicyId,
  own_policy: PolicyId,
  tx: Transaction,
) -> Bool {
  let Transaction { extra_signatories, inputs, outputs, mint, .. } = tx

  // Only one output at the script address
  expect [own_output] =
    list.filter(
      outputs,
      fn(o) { o.address.payment_credential == Script(own_policy) },
    )

  expect Some(_) = list.find(inputs, fn(i) { i.output_reference == seed })

  // Extract value and datum
  expect Output {
    value: o_value,
    datum: InlineDatum(o_datum),
    reference_script: None,
    ..
  } = own_output

  expect OrderDatum {
    owner: o_d_owner,
    operation: o_d_operation,
    direction: o_d_direction,
    price: o_d_price,
    expected_tokens: o_d_expected_tokens,
  }: OrderDatum = o_datum

  // Minting only 1 control token in this policy
  expect [Pair(minted_tn, 1)] = tokens(mint, own_policy) |> to_pairs()

  let expected_value =
    calculate_offered_tokens(
      o_d_direction,
      o_d_operation,
      o_d_price,
      o_d_expected_tokens,
      position_token_policy,
    )

  and {
    // Signed by owner
    list.has(extra_signatories, o_d_owner),
    // Value has offered tokens and control token
    match(o_value, add(expected_value, own_policy, minted_tn, 1), >=),
    // Control token has correct name
    minted_tn == blake2b_256(cbor.serialise(seed)),
  }
}

pub fn validate_cancel(
  own_datum: OrderDatum,
  own_policy: PolicyId,
  own_value: Value,
  tx: Transaction,
) -> Bool {
  let Transaction { extra_signatories, mint, .. } = tx

  let neg_control_token = tokens(negate(own_value), own_policy)

  and {
    // Owner is signing the transaction
    list.has(extra_signatories, own_datum.owner),
    // Control token is burnt
    match(mint, neg_control_token, ==),
  }
}

pub fn validate_match(
  own_policy: PolicyId,
  market_script_hash: ScriptHash,
  tx: Transaction,
) -> Bool {
  let Transaction { inputs, outputs, mint, .. } = tx

  // Expect two inputs from the own script
  expect [input_a,
    input_b] =
    list.filter(
      inputs,
      fn(i) { i.output.address.payment_credential == Script(own_policy) },
    )

  // Determine which input is "self" and which is "other"
  expect Input {
    output: Output { value: a_value, datum: InlineDatum(a_raw_datum), .. },
    ..
  } = input_a

  expect Input {
    output: Output { value: b_value, datum: InlineDatum(b_raw_datum), .. },
    ..
  } = input_b

  expect a_datum: OrderDatum = a_raw_datum
  expect b_datum: OrderDatum = b_raw_datum

  // Expect different directions
  expect a_datum.direction != b_datum.direction

  // Expect both operations to be Buy
  expect a_datum.operation == Buy
  expect b_datum.operation == Buy

  // Expect the sum of the prices to be 1
  // price_a.num / price_a.den + price_b.num / price_b.den == 1
  // => price_a.num * price_b.den + price_b.num * price_a.den == price_a.den * price_b.den
  let price_sum_numerator =
    a_datum.price.numerator * b_datum.price.denominator + b_datum.price.numerator * a_datum.price.denominator
  let price_sum_denominator =
    a_datum.price.denominator * b_datum.price.denominator
  expect price_sum_numerator == price_sum_denominator

  // Figure out which order has the greater amount (the one that continues)
  // and which has the smaller amount (the one that gets fully consumed)
  let (bigger_datum, bigger_value, smaller_datum, _smaller_value) =
    if a_datum.expected_tokens >= b_datum.expected_tokens {
      (a_datum, a_value, b_datum, b_value)
    } else {
      (b_datum, b_value, a_datum, a_value)
    }

  let matched_amount = smaller_datum.expected_tokens

  // The order with the greater amount should be replicated with updated expected_tokens and value
  let is_complete_fill = bigger_datum.expected_tokens == matched_amount

  let continuing_order_ok = or {
      // Complete fill: both control tokens burned
      is_complete_fill,
      // Partial fill: bigger order continues
      {
        let expected_continuing_datum =
          OrderDatum {
            ..bigger_datum,
            expected_tokens: bigger_datum.expected_tokens - matched_amount,
          }
        let expected_continuing_datum_data: Data = expected_continuing_datum

        let filled_lovelace =
          matched_amount * bigger_datum.price.numerator / bigger_datum.price.denominator

        let expected_continuing_value =
          merge(bigger_value, negate(from_lovelace(filled_lovelace)))

        list.any(
          outputs,
          fn(Output { address: o_addr, value: o_val, datum: o_datum, .. }) {
            if o_addr.payment_credential == Script(own_policy) {
              expect InlineDatum(o_dat) = o_datum
              and {
                match(o_val, expected_continuing_value, >=),
                o_dat == expected_continuing_datum_data,
              }
            } else {
              False
            }
          },
        )
      },
    }

  // The other order control token should be burned
  // If complete fill, both control tokens should be burned (2 tokens burned from own_policy)
  // If partial fill, only the smaller order's control token should be burned (1 token burned)
  let expected_burn_count =
    if is_complete_fill {
      -2
    } else {
      -1
    }

  let control_tokens_burned =
    dict.foldl(tokens(mint, own_policy), 0, fn(_, qty, acc) { acc + qty })

  // Both owners should be paid the corresponding position tokens (Up/Down)
  let a_position_tn =
    when a_datum.direction is {
      Up -> up_tn
      Down -> down_tn
    }

  let b_position_tn =
    when b_datum.direction is {
      Up -> up_tn
      Down -> down_tn
    }

  let a_owner_paid =
    list.any(
      outputs,
      fn(Output { address: o_addr, value: o_val, .. }) {
        o_addr.payment_credential == VerificationKey(a_datum.owner) && match(
          o_val,
          from_asset(market_script_hash, a_position_tn, matched_amount),
          >=,
        )
      },
    )

  let b_owner_paid =
    list.any(
      outputs,
      fn(Output { address: o_addr, value: o_val, .. }) {
        o_addr.payment_credential == VerificationKey(b_datum.owner) && match(
          o_val,
          from_asset(market_script_hash, b_position_tn, matched_amount),
          >=,
        )
      },
    )

  // Up and Down tokens should be minted and sent to the owners
  let up_minted = quantity_of(mint, market_script_hash, up_tn) == matched_amount
  let down_minted =
    quantity_of(mint, market_script_hash, down_tn) == matched_amount

  // Adas should be paid to the market utxo
  // The market output should have the market input's existing value plus the matched lovelace
  let total_lovelace =
    matched_amount * a_datum.price.numerator / a_datum.price.denominator + matched_amount * b_datum.price.numerator / b_datum.price.denominator

  expect Some(market_input) =
    list.find(
      inputs,
      fn(i) {
        i.output.address.payment_credential == Script(market_script_hash)
      },
    )

  let expected_market_value =
    merge(market_input.output.value, from_lovelace(total_lovelace))

  let market_paid =
    list.any(
      outputs,
      fn(Output { address: o_addr, value: o_val, .. }) {
        o_addr.payment_credential == Script(market_script_hash) && match(
          o_val,
          expected_market_value,
          >=,
        )
      },
    )

  // The market utxo is already guaranteed to be consumed by the expect Some(market_input) above
  and {
    continuing_order_ok,
    control_tokens_burned == expected_burn_count,
    a_owner_paid,
    b_owner_paid,
    up_minted,
    down_minted,
    market_paid,
  }
}

pub fn validate_fill(
  own_datum: OrderDatum,
  own_value: Value,
  own_policy: PolicyId,
  filled_amount: Int,
  position_token_policy: PolicyId,
  tx: Transaction,
) -> Bool {
  let Transaction { outputs, mint, .. } = tx

  expect [Pair(control_token_tn, 1)] =
    tokens(own_value, own_policy) |> to_pairs()

  let OrderDatum {
    direction: i_d_direction,
    operation: i_d_operation,
    price: i_d_price,
    owner: i_d_owner,
    expected_tokens: i_d_expected_tokens,
  } = own_datum

  let expected_owner_value =
    calculate_asked_tokens(
      i_d_direction,
      i_d_operation,
      i_d_price,
      filled_amount,
      position_token_policy,
    )

  // Owner expected output
  //   addr: owner
  //   Value: filled tokens
  let owner_output_found =
    list.any(
      outputs,
      fn(Output { address: o_addr, value: o_val, .. }) {
        o_addr.payment_credential == VerificationKey(i_d_owner) && match(
          o_val,
          expected_owner_value,
          >=,
        )
      },
    )

  let continuing_order_ok = or {
      and {
        // Is complete fill
        i_d_expected_tokens == filled_amount,
        // Control token is burnt
        quantity_of(mint, own_policy, control_token_tn) == -1,
      },
      {
        let expected_datum =
          OrderDatum {
            ..own_datum,
            expected_tokens: i_d_expected_tokens - filled_amount,
          }
        let expected_datum_data: Data = expected_datum

        let offered_tokens =
          calculate_offered_tokens(
            i_d_direction,
            i_d_operation,
            i_d_price,
            filled_amount,
            position_token_policy,
          )

        let expected_order_value = merge(own_value, negate(offered_tokens))

        // Continuing order
        //   addr: own_policy
        //   Value: own_value - filled_amount
        //   Datum: expected_datum
        list.any(
          outputs,
          fn(Output { address: o_addr, value: o_val, datum: o_datum, .. }) {
            if o_addr.payment_credential == Script(own_policy) {
              expect InlineDatum(o_dat) = o_datum

              and {
                match(o_val, expected_order_value, >=),
                o_dat == expected_datum_data,
              }
            } else {
              False
            }
          },
        )
      },
    }

  and {
    owner_output_found,
    continuing_order_ok,
  }
}

//-------------------------
// LIBRARY
//-------------------------

pub fn calculate_asked_tokens(
  dir: Direction,
  op: Operation,
  price: Price,
  filled_amount: Int,
  position_token_policy: PolicyId,
) {
  when op is {
    Buy ->
      when dir is {
        Up -> from_asset(position_token_policy, up_tn, filled_amount)
        Down -> from_asset(position_token_policy, down_tn, filled_amount)
      }
    Sell -> from_lovelace(filled_amount * price.numerator / price.denominator)
  }
}

pub fn calculate_offered_tokens(
  dir: Direction,
  op: Operation,
  price: Price,
  filled_amount: Int,
  position_token_policy: PolicyId,
) {
  when op is {
    Buy -> from_lovelace(filled_amount * price.numerator / price.denominator)
    Sell ->
      when dir is {
        Up -> from_asset(position_token_policy, up_tn, filled_amount)
        Down -> from_asset(position_token_policy, down_tn, filled_amount)
      }
  }
}
