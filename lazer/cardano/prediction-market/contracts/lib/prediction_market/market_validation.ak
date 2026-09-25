use aiken/collection/dict
use aiken/collection/list
use aiken/interval.{Finite}
use cardano/address.{Script}
use cardano/assets
use cardano/transaction.{InlineDatum, OutputReference, Transaction, find_input}
use prediction_market/types.{MarketDatum, No, Yes}
use pyth
use types/u32

// Token names
pub const yes_token: ByteArray = "YES"

pub const no_token: ByteArray = "NO"

pub const state_thread_token: ByteArray = ""

fn has_state_thread(value: assets.Value, policy_id: assets.PolicyId) -> Bool {
  assets.quantity_of(value, policy_id, state_thread_token) == 1
}

fn has_no_market_policy_mint(
  policy_id: assets.PolicyId,
  tx: Transaction,
) -> Bool {
  let mint_dict = tx.mint |> assets.tokens(policy_id)
  dict.foldl(mint_dict, True, fn(_asset_name, _qty, _acc) { False })
}

fn only_mints_market_token(
  policy_id: assets.PolicyId,
  token_name: ByteArray,
  amount: Int,
  tx: Transaction,
) -> Bool {
  let mint_dict = tx.mint |> assets.tokens(policy_id)

  assets.quantity_of(tx.mint, policy_id, token_name) == amount && dict.foldl(
    mint_dict,
    True,
    fn(asset_name, qty, acc) {
      acc && asset_name == token_name && qty == amount
    },
  )
}

fn only_burns_market_token(
  policy_id: assets.PolicyId,
  token_name: ByteArray,
  amount: Int,
  burn_state_thread: Bool,
  tx: Transaction,
) -> Bool {
  let mint_dict = tx.mint |> assets.tokens(policy_id)

  assets.quantity_of(tx.mint, policy_id, token_name) == amount && if burn_state_thread {
    assets.quantity_of(tx.mint, policy_id, state_thread_token) == -1
  } else {
    assets.quantity_of(tx.mint, policy_id, state_thread_token) == 0
  } && dict.foldl(
    mint_dict,
    True,
    fn(asset_name, qty, acc) {
      acc && if asset_name == token_name {
        qty == amount
      } else {
        burn_state_thread && asset_name == state_thread_token && qty == -1
      }
    },
  )
}

// ─── Bet validation ──────────────────────────────────────────────────────────

pub fn validate_bet(
  datum: MarketDatum,
  direction: types.BetDirection,
  amount: Int,
  spend_out_ref: OutputReference,
  tx: Transaction,
) -> Bool {
  // Market must not be resolved
  expect !datum.resolved

  // Amount must be positive
  expect amount > 0

  // Must be before resolution time
  expect Finite(upper) = tx.validity_range.upper_bound.bound_type
  expect upper <= datum.resolution_time

  // Calculate tokens out via constant product formula
  let (tokens_out, new_datum) =
    when direction is {
      Yes -> {
        let tokens = datum.yes_reserve - datum.k / ( datum.no_reserve + amount )
        expect tokens > 0
        let new =
          MarketDatum {
            ..datum,
            yes_reserve: datum.yes_reserve - tokens,
            no_reserve: datum.no_reserve + amount,
            total_yes_minted: datum.total_yes_minted + tokens,
            total_ada: datum.total_ada + amount,
          }
        (tokens, new)
      }
      No -> {
        let tokens = datum.no_reserve - datum.k / ( datum.yes_reserve + amount )
        expect tokens > 0
        let new =
          MarketDatum {
            ..datum,
            yes_reserve: datum.yes_reserve + amount,
            no_reserve: datum.no_reserve - tokens,
            total_no_minted: datum.total_no_minted + tokens,
            total_ada: datum.total_ada + amount,
          }
        (tokens, new)
      }
    }

  // Find continuing output at script address with updated datum
  expect Some(spend_input) = find_input(tx.inputs, spend_out_ref)
  expect Script(market_policy_id) =
    spend_input.output.address.payment_credential
  let script_address = spend_input.output.address
  expect has_state_thread(spend_input.output.value, market_policy_id)

  expect Some(continuing_output) =
    tx.outputs
      |> list.find(fn(output) { output.address == script_address })

  // Verify continuing output has correct datum
  expect InlineDatum(out_datum) = continuing_output.datum
  expect output_market_datum: MarketDatum = out_datum
  expect output_market_datum == new_datum
  expect has_state_thread(continuing_output.value, market_policy_id)

  // Verify correct tokens are minted
  let expected_token_name =
    when direction is {
      Yes -> yes_token
      No -> no_token
    }

  expect
    only_mints_market_token(
      market_policy_id,
      expected_token_name,
      tokens_out,
      tx,
    )

  // Verify ADA increased by bet amount
  let input_lovelace = assets.lovelace_of(spend_input.output.value)
  let output_lovelace = assets.lovelace_of(continuing_output.value)
  expect output_lovelace >= input_lovelace + amount

  True
}

// ─── Resolve validation ──────────────────────────────────────────────────────

pub fn validate_resolve(
  datum: MarketDatum,
  spend_out_ref: OutputReference,
  tx: Transaction,
) -> Bool {
  // Market must not already be resolved
  expect !datum.resolved

  // Must be after resolution time
  expect Finite(lower) = tx.validity_range.lower_bound.bound_type
  expect lower >= datum.resolution_time

  // Get verified price from Pyth Lazer oracle
  expect [update] = pyth.get_updates(datum.pyth_id, tx)
  expect Some(feed) =
    list.find(update.feeds, fn(f) { u32.as_int(f.feed_id) == datum.feed_id })
  expect Some(Some(oracle_price)) = feed.price

  // Determine winning side
  let winning_side =
    if oracle_price > datum.target_price {
      Yes
    } else {
      No
    }

  // Creator must sign (hackathon simplification)
  expect tx.extra_signatories |> list.has(datum.creator)

  // Verify continuing output
  expect Some(spend_input) = find_input(tx.inputs, spend_out_ref)
  expect Script(market_policy_id) =
    spend_input.output.address.payment_credential
  let script_address = spend_input.output.address
  expect has_state_thread(spend_input.output.value, market_policy_id)

  let expected_datum =
    MarketDatum { ..datum, resolved: True, winning_side: Some(winning_side) }

  expect Some(continuing_output) =
    tx.outputs
      |> list.find(fn(output) { output.address == script_address })

  expect InlineDatum(out_datum) = continuing_output.datum
  expect output_market_datum: MarketDatum = out_datum
  expect output_market_datum == expected_datum
  expect has_state_thread(continuing_output.value, market_policy_id)
  expect has_no_market_policy_mint(market_policy_id, tx)

  // Value must be preserved (no ADA removed during resolve)
  let input_lovelace = assets.lovelace_of(spend_input.output.value)
  let output_lovelace = assets.lovelace_of(continuing_output.value)
  expect output_lovelace >= input_lovelace

  True
}

// ─── Claim validation ────────────────────────────────────────────────────────

pub fn validate_claim(
  datum: MarketDatum,
  burn_amount: Int,
  spend_out_ref: OutputReference,
  tx: Transaction,
) -> Bool {
  // Market must be resolved
  expect datum.resolved
  expect Some(winning_side) = datum.winning_side
  expect burn_amount > 0

  // Determine winning token name and total minted
  let (winning_token, total_winning_minted) =
    when winning_side is {
      Yes -> (yes_token, datum.total_yes_minted)
      No -> (no_token, datum.total_no_minted)
    }

  // Calculate payout
  let payout = burn_amount * datum.total_ada / total_winning_minted

  // Verify continuing output with reduced values
  expect Some(spend_input) = find_input(tx.inputs, spend_out_ref)
  expect Script(market_policy_id) =
    spend_input.output.address.payment_credential
  let script_address = spend_input.output.address
  expect has_state_thread(spend_input.output.value, market_policy_id)

  let expected_datum =
    when winning_side is {
      Yes ->
        MarketDatum {
          ..datum,
          total_ada: datum.total_ada - payout,
          total_yes_minted: datum.total_yes_minted - burn_amount,
        }
      No ->
        MarketDatum {
          ..datum,
          total_ada: datum.total_ada - payout,
          total_no_minted: datum.total_no_minted - burn_amount,
        }
    }

  // If all winning tokens are claimed, no continuing output needed
  if total_winning_minted == burn_amount {
    // Last claimer — gets whatever remains, no continuing output required
    expect
      only_burns_market_token(
        market_policy_id,
        winning_token,
        -burn_amount,
        True,
        tx,
      )
    True
  } else {
    expect Some(continuing_output) =
      tx.outputs
        |> list.find(fn(output) { output.address == script_address })

    expect InlineDatum(out_datum) = continuing_output.datum
    expect output_market_datum: MarketDatum = out_datum
    expect output_market_datum == expected_datum
    expect has_state_thread(continuing_output.value, market_policy_id)
    expect
      only_burns_market_token(
        market_policy_id,
        winning_token,
        -burn_amount,
        False,
        tx,
      )

    // Verify ADA decreased by exactly payout
    let input_lovelace = assets.lovelace_of(spend_input.output.value)
    let output_lovelace = assets.lovelace_of(continuing_output.value)
    expect output_lovelace >= input_lovelace - payout

    True
  }
}

// ─── Mint validation ─────────────────────────────────────────────────────────

pub fn validate_mint_tokens(
  one_shot: OutputReference,
  policy_id: assets.PolicyId,
  tx: Transaction,
) -> Bool {
  let one_shot_consumed =
    tx.inputs
      |> list.any(fn(input) { input.output_reference == one_shot })

  let has_market_spend =
    tx.inputs
      |> list.any(
          fn(input) {
            input.output.address.payment_credential == Script(policy_id) && has_state_thread(
              input.output.value,
              policy_id,
            )
          },
        )

  let minted_state_thread_qty =
    assets.quantity_of(tx.mint, policy_id, state_thread_token)

  let mint_dict = tx.mint |> assets.tokens(policy_id)
  let all_market_mints_are_positive =
    dict.foldl(mint_dict, True, fn(_asset_name, qty, acc) { acc && qty > 0 })

  expect all_market_mints_are_positive

  if one_shot_consumed {
    expect minted_state_thread_qty == 1
    True
  } else {
    expect minted_state_thread_qty == 0
    has_market_spend
  }
}

pub fn validate_burn_tokens(policy_id: assets.PolicyId, tx: Transaction) -> Bool {
  let mint_dict = tx.mint |> assets.tokens(policy_id)
  dict.foldl(mint_dict, True, fn(_key, qty, acc) { acc && qty < 0 })
}
