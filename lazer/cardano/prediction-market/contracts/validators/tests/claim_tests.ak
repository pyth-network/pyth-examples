use aiken/interval
use cardano/assets
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}
use prediction_market/market_validation.{validate_claim}
use prediction_market/mocks.{
  mock_market_datum, mock_market_hash, mock_market_input, mock_market_value,
  mock_script_address, mock_transaction, mock_tx_id,
}
use prediction_market/types.{MarketDatum, No, Yes}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn mock_spend_ref() -> OutputReference {
  OutputReference { transaction_id: mock_tx_id, output_index: 0 }
}

fn resolved_yes_datum() -> MarketDatum {
  MarketDatum { ..mock_market_datum(), resolved: True, winning_side: Some(Yes) }
}

fn resolved_no_datum() -> MarketDatum {
  MarketDatum { ..mock_market_datum(), resolved: True, winning_side: Some(No) }
}

/// Build a valid claim transaction
fn claim_tx(
  datum: MarketDatum,
  burn_amount: Int,
  winning_token: ByteArray,
) -> Transaction {
  let total_winning =
    when datum.winning_side is {
      Some(Yes) -> datum.total_yes_minted
      Some(No) -> datum.total_no_minted
      None -> 0
    }

  let payout = burn_amount * datum.total_ada / total_winning

  let new_datum =
    when datum.winning_side is {
      Some(Yes) ->
        MarketDatum {
          ..datum,
          total_ada: datum.total_ada - payout,
          total_yes_minted: datum.total_yes_minted - burn_amount,
        }
      Some(No) ->
        MarketDatum {
          ..datum,
          total_ada: datum.total_ada - payout,
          total_no_minted: datum.total_no_minted - burn_amount,
        }
      None -> datum
    }

  let is_last_claim = total_winning == burn_amount

  let outputs =
    if is_last_claim {
      []
    } else {
      [
        Output {
          address: mock_script_address(),
          value: mock_market_value(datum.total_ada - payout),
          datum: InlineDatum(new_datum),
          reference_script: None,
        },
      ]
    }

  let minted =
    if is_last_claim {
      assets.zero
        |> assets.add(mock_market_hash, winning_token, -burn_amount)
        |> assets.add(mock_market_hash, "", -1)
    } else {
      assets.zero |> assets.add(mock_market_hash, winning_token, -burn_amount)
    }

  Transaction {
    ..mock_transaction(),
    inputs: [mock_market_input(datum.total_ada)],
    outputs: outputs,
    mint: minted,
    validity_range: interval.between(300_000, 400_000),
  }
}

// ── Success cases ────────────────────────────────────────────────────────────

test claim_yes_partial() {
  let datum = resolved_yes_datum()
  // Burn 50 of 100 YES tokens → payout = 50 * 100M / 100M = 50M
  let tx = claim_tx(datum, 50_000_000, "YES")
  validate_claim(datum, 50_000_000, mock_spend_ref(), tx)
}

test claim_no_partial() {
  let datum = resolved_no_datum()
  let tx = claim_tx(datum, 50_000_000, "NO")
  validate_claim(datum, 50_000_000, mock_spend_ref(), tx)
}

test claim_yes_full() {
  let datum = resolved_yes_datum()
  // Burn all YES tokens — last claimer, no continuing output
  let tx = claim_tx(datum, datum.total_yes_minted, "YES")
  validate_claim(datum, datum.total_yes_minted, mock_spend_ref(), tx)
}

test claim_no_full() {
  let datum = resolved_no_datum()
  let tx = claim_tx(datum, datum.total_no_minted, "NO")
  validate_claim(datum, datum.total_no_minted, mock_spend_ref(), tx)
}

// ── Failure cases ────────────────────────────────────────────────────────────

test claim_unresolved_fails() fail {
  let datum = mock_market_datum()
  let tx = claim_tx(datum, 50_000_000, "YES")
  validate_claim(datum, 50_000_000, mock_spend_ref(), tx)
}

test claim_zero_fails() fail {
  let datum = resolved_yes_datum()
  let tx = claim_tx(datum, 0, "YES")
  validate_claim(datum, 0, mock_spend_ref(), tx)
}

test claim_wrong_burn_amount_fails() fail {
  let datum = resolved_yes_datum()
  // Tx burns 50M but we claim 30M → mismatch
  let tx = claim_tx(datum, 50_000_000, "YES")
  validate_claim(datum, 30_000_000, mock_spend_ref(), tx)
}

test claim_wrong_token_burned_fails() fail {
  let datum = resolved_yes_datum()
  // YES wins but we burn NO tokens
  let tx =
    Transaction {
      ..mock_transaction(),
      inputs: [mock_market_input(datum.total_ada)],
      outputs: [
        Output {
          address: mock_script_address(),
          value: mock_market_value(datum.total_ada - 50_000_000),
          datum: InlineDatum(
            MarketDatum {
              ..datum,
              total_ada: datum.total_ada - 50_000_000,
              total_yes_minted: datum.total_yes_minted - 50_000_000,
            },
          ),
          reference_script: None,
        },
      ],
      mint: // Burning NO tokens instead of YES
      assets.zero
        |> assets.add(mock_market_hash, "NO", -50_000_000),
      validity_range: interval.between(300_000, 400_000),
    }
  validate_claim(datum, 50_000_000, mock_spend_ref(), tx)
}

test claim_full_without_state_thread_burn_fails() fail {
  let datum = resolved_yes_datum()
  let tx =
    Transaction {
      ..mock_transaction(),
      inputs: [mock_market_input(datum.total_ada)],
      outputs: [],
      mint: assets.zero
        |> assets.add(mock_market_hash, "YES", -datum.total_yes_minted),
      validity_range: interval.between(300_000, 400_000),
    }
  validate_claim(datum, datum.total_yes_minted, mock_spend_ref(), tx)
}

test claim_partial_missing_state_thread_in_output_fails() fail {
  let datum = resolved_yes_datum()
  let tx =
    Transaction {
      ..mock_transaction(),
      inputs: [mock_market_input(datum.total_ada)],
      outputs: [
        Output {
          address: mock_script_address(),
          value: assets.from_lovelace(datum.total_ada - 50_000_000),
          datum: InlineDatum(
            MarketDatum {
              ..datum,
              total_ada: datum.total_ada - 50_000_000,
              total_yes_minted: datum.total_yes_minted - 50_000_000,
            },
          ),
          reference_script: None,
        },
      ],
      mint: assets.zero
        |> assets.add(mock_market_hash, "YES", -50_000_000),
      validity_range: interval.between(300_000, 400_000),
    }
  validate_claim(datum, 50_000_000, mock_spend_ref(), tx)
}
