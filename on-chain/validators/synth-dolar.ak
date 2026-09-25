use aiken/collection/dict
use utils.{compute_expected_synth_amount, health_ratio}
use aiken/collection/list
use cardano/address.{Script}
use cardano/assets.{PolicyId, Value, lovelace_of, tokens}
use cardano/transaction.{Transaction, OutputReference, InlineDatum}
use pyth
use pyth.{PriceUpdate}
use types/u32

pub type PoolDatum {
  owner: ByteArray
}

pub type Action {
  Mint
  Burn
  Liquidate
}

validator synth_dolar(
  pyth_policy_id: PolicyId,
  ada_usd_feed_id: Int,
  collateral_ratio: Int,
  liquidation_threshold: Int,
) {
  mint(redeemer: Action, policy_id: PolicyId, self: Transaction) {
    let (raw_price, exponent) =
      get_ada_usd_price(pyth_policy_id, ada_usd_feed_id, self)

    let Transaction { inputs, outputs, mint, extra_signatories, .. } = self

    let minted_amount = get_minted_amount(mint, policy_id)

    when redeemer is {
      Mint -> {
        let ada_deposited = get_ada_delta(policy_id, inputs, outputs)
        let is_deposit_not_zero: Bool = ada_deposited >= 1


        
        // Collateral requirement: the user can only mint a fraction of the ADA's
        // USD value. With collateral_ratio=150, $1.50 of ADA mints $1.00 of synth.
        let expected_minted_amount =
          compute_expected_synth_amount(ada_deposited, raw_price, exponent) * 100 / collateral_ratio

        let is_deposit_correct: Bool = minted_amount == expected_minted_amount

        and {
          is_deposit_not_zero,
          is_deposit_correct,
        }
      }

      Burn -> {
        let ada_delta = get_ada_delta(policy_id, inputs, outputs)
        let ada_withdrawn = ada_delta * -1
        let is_withdrawal_not_zero: Bool = ada_withdrawn >= 1

        let expected_burned_amount =
          compute_expected_synth_amount(ada_withdrawn, raw_price, exponent)

        let is_burn_correct: Bool = minted_amount == -expected_burned_amount

        // Only the owner can burn — extract owner from pool input datum.
        expect [pool_input] =
          list.filter(
            inputs,
            fn(i) { i.output.address.payment_credential == Script(policy_id) },
          )
        expect InlineDatum(datum_data) = pool_input.output.datum
        expect datum: PoolDatum = datum_data
        let is_owner_signed: Bool =
          list.has(extra_signatories, datum.owner)

        and {
          is_withdrawal_not_zero,
          is_burn_correct,
          is_owner_signed,
        }
      }

      Liquidate -> {
        let ada_delta = get_ada_delta(policy_id, inputs, outputs)
        let ada_withdrawn = ada_delta * -1
        let is_withdrawal_not_zero: Bool = ada_withdrawn >= 1

        let expected_burned_amount =
          compute_expected_synth_amount(ada_withdrawn, raw_price, exponent)

        let is_burn_correct: Bool = minted_amount == -expected_burned_amount

        // Position must be unhealthy for liquidation to be valid — anyone can liquidate.
        let pool_ada = get_pool_ada(policy_id, inputs)
        let current_debt = compute_expected_synth_amount(pool_ada, raw_price, exponent)
        let remaining_debt = current_debt + minted_amount
        let remaining_ada = pool_ada - ada_withdrawn
        let health =
          health_ratio(remaining_ada, remaining_debt, raw_price, exponent)
        let is_liquidatable: Bool = health < liquidation_threshold

        and {
          is_withdrawal_not_zero,
          is_burn_correct,
          is_liquidatable,
        }
      }
    }
  }

  spend(_datum: Option<Data>, _redeemer: Action, utxo: OutputReference, self: Transaction) {
    // Derive the policy_id from the UTxO being spent — since it's a multi-validator,
    // the script hash of the spend address equals the mint policy_id.
    let Transaction { inputs, mint, .. } = self
    expect Some(own_input) =
      list.find(inputs, fn(i) { i.output_reference == utxo })
    expect Script(policy_id) = own_input.output.address.payment_credential

    // Delegate all validation to the mint policy.
    // The spend validator just ensures the mint policy is running in this tx,
    // which guarantees price, math, health and owner checks are enforced.
    get_minted_amount(mint, policy_id) != 0
  }

  else(_ctx) {
    fail
  }
}

/// Returns the lovelace balance of the pool UTxO at the script address.
/// Used to derive current debt and health ratio without tracking state in the datum.
fn get_pool_ada(policy_id: PolicyId, inputs: List<transaction.Input>) -> Int {
  expect [pool_input] =
    list.filter(
      inputs,
      fn(i) { i.output.address.payment_credential == Script(policy_id) },
    )
  lovelace_of(pool_input.output.value)
}

/// Fetches the ADA/USD raw price and exponent from Pyth Lazer.
///
/// Requires the transaction to include:
///   - A Pyth State NFT reference input (identified by `pyth_policy_id`)
///   - A 0-ADA withdrawal from the Pyth verify script carrying the signed
///     price message as redeemer — verified by that script, not here.
///
/// Returns `(raw_price, exponent)` where the real price in USD is:
///   real_price = raw_price × 10^exponent
///
/// For ADA/USD (feed_id=16, exponent=-8):
///   raw_price = 70_000_000  →  $0.70 per ADA
fn get_ada_usd_price(
  pyth_policy_id: PolicyId,
  ada_usd_feed_id: Int,
  tx: Transaction,
) -> (Int, Int) {
  // Pull all price updates from the transaction — the Pyth withdraw script
  // has already verified the Ed25519 signature by the time we get here.
  let updates = pyth.get_updates(pyth_policy_id, tx)

  // We expect exactly one price update message per transaction.
  expect [update] = updates
  let PriceUpdate { feeds, .. } = update

  // Find the feed matching our target asset (ADA/USD = feed_id 16).
  expect Some(feed) =
    list.find(feeds, fn(f) { u32.as_int(f.feed_id) == ada_usd_feed_id })

  // Unwrap the price — the double Option means:
  //   None         → field not included in this update (fail)
  //   Some(None)   → price unavailable from publishers (fail)
  //   Some(Some(p) → valid price ✓
  expect Some(Some(raw_price)) = feed.price

  // Exponent scales the raw integer to a real USD value:
  //   real_price = raw_price × 10^exponent
  expect Some(exponent) = feed.exponent

  (raw_price, exponent)
}

/// Returns the total quantity of tokens minted or burned under a given policy.
/// Positive = minting, negative = burning.
fn get_minted_amount(mint: Value, policy_id: PolicyId) -> Int {
  tokens(mint, policy_id)
    |> dict.values()
    |> list.foldl(0, fn(qty, acc) { acc + qty })
}

/// Finds the pool input and output UTxOs at the script address and returns
/// the raw ADA delta (output - input).
///
/// Positive = ADA entered the pool (Mint).
/// Negative = ADA left the pool (Burn).
///
/// The pool input is optional: on the first-ever Mint there is no existing
/// pool UTxO, so input_lovelace defaults to 0 and the full output amount
/// counts as the deposit.
fn get_ada_delta(
  policy_id: PolicyId,
  inputs: List<transaction.Input>,
  outputs: List<transaction.Output>,
) -> Int {
  let pool_inputs =
    list.filter(
      inputs,
      fn(i) { i.output.address.payment_credential == Script(policy_id) },
    )

  let input_lovelace =
    when pool_inputs is {
      [] -> 0
      [pool_input] -> lovelace_of(pool_input.output.value)
      _ -> fail @"more than one pool input"
    }

  expect [pool_output] =
    list.filter(
      outputs,
      fn(o) { o.address.payment_credential == Script(policy_id) },
    )

  let output_lovelace = lovelace_of(pool_output.value)

  output_lovelace - input_lovelace
}
