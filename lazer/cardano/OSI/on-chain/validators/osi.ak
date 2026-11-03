use aiken/interval
use aiken/math/rational
use cardano/address.{PaymentCredential, Script}
use cardano/assets.{PolicyId, lovelace_of}
use cardano/transaction.{
  Output, OutputReference, Transaction, find_script_outputs, InlineDatum
}
use pyth.{Feed, PriceUpdate, get_updates}
use types/u32.{U32, from_int}
use types/u64
use utils.{quote_price_multiplier}

pub type OsiDatum {
  deadline: Int,
  payees: Pairs<PaymentCredential, Int>,
}

pub type OsiRedeemers {
  Fund
  Payout
}

/// Oracle-settled Invoice
validator oracle_settled_invoice(pyth_policy: PolicyId, base_currency: Int) {
  spend(
    datum: Option<OsiDatum>,
    redeemer: OsiRedeemers,
    utxo: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { inputs, outputs, .. } = tx

    when redeemer is {
      Fund -> {
        expect Some(input_datum) = datum
        let in = inputs |> transaction.resolve_input(utxo)
        expect Script(script_hash) = in.address.payment_credential
        expect [out] = find_script_outputs(outputs, script_hash)

        // Verify that the datum is preserved in the output
        expect InlineDatum(data) = out.datum
        expect out_datum: OsiDatum = data

        and {
          input_datum == out_datum,
          lovelace_of(out.value) >= lovelace_of(in.value),
        }
      }

      Payout -> {
        expect Some(datum) = datum
        let OsiDatum { deadline, payees } = datum
        let in = inputs |> transaction.resolve_input(utxo)
        expect Script(script_hash) = in.address.payment_credential
        let spendable_lovelace = lovelace_of(in.value) - tx.fee

        expect [price_update] = get_updates(pyth_policy, tx)

        expect [quote_feed, base_feed] = price_update.feeds

        expect Feed {
          feed_id: ada_price_feed_id,
          price: Some(Some(quote_price)),
          exponent: Some(quote_exponent),
          feed_update_timestamp: Some(Some(timestamp_1)),
          ..
        } = quote_feed

        expect Feed {
          feed_id: quote_feed_id,
          price: Some(Some(base_price)),
          exponent: Some(base_exponent),
          feed_update_timestamp: Some(Some(timestamp_2)),
          ..
        } = base_feed

        let quote_multiplier =
          quote_price_multiplier(
            base_price,
            base_exponent,
            quote_price,
            quote_exponent,
          )

        and {
          // Base currency feed must match the expected base asset id
          trace_if_false(
            (quote_feed_id == from_int(base_currency))?,
            @"Base currency feed does not match expected base asset id",
          ),
          // Price feed must be updated within the transaction's validity range
          trace_if_false(
            (tx.validity_range
              |> interval.contains(u64.as_int(price_update.timestamp_us) / 1000))?,
            @"Price feed not updated within transaction validity range"
          ),
          // Payment must be made before the deadline
          trace_if_false(
            (tx.validity_range
              |> interval.is_entirely_before(deadline))?,
            @"Payment not made before the deadline",
          ),
          // Payouts must be made in datum order, and any remainder must stay in the script
          trace_if_false(
            payouts_and_remaining_match(
              payees,
              outputs,
              quote_multiplier,
              Script(script_hash),
              spendable_lovelace,
            )?,
            @"Payout outputs or remaining script funds do not match expected values"
          )
        }
      }
    }
  }

  else(_) {
    fail
  }
}

fn trace_if_false(condition: Bool, message: String) -> Bool {
  if condition {
    True
  } else {
    fail message
  }
}

fn payouts_and_remaining_match(
  payees: Pairs<PaymentCredential, Int>,
  outputs: List<Output>,
  quote_multiplier: rational.Rational,
  script_credential: PaymentCredential,
  remaining_input_lovelace: Int,
) -> Bool {
  when payees is {
    [] ->
      if remaining_input_lovelace <= 0 {
        True
      } else {
        when outputs is {
          [Output { address, value, .. }, ..] ->
            and {
              address.payment_credential == script_credential,
              lovelace_of(value) >= remaining_input_lovelace,
            }
          [] -> False
        }
      }
    [Pair(payee, quote_amount), ..rest_payees] ->
      when outputs is {
        [] -> False
        [Output { address, value, .. }, ..rest_outputs] -> {
          expect Some(expected_payout) =
            rational.div(rational.from_int(quote_amount), quote_multiplier)
          let paid_lovelace = lovelace_of(value)

          and {
            address.payment_credential == payee,
            paid_lovelace >= rational.floor(expected_payout),
            paid_lovelace <= remaining_input_lovelace,
            payouts_and_remaining_match(
              rest_payees,
              rest_outputs,
              quote_multiplier,
              script_credential,
              remaining_input_lovelace - paid_lovelace,
            ),
          }
        }
      }
  }
}
