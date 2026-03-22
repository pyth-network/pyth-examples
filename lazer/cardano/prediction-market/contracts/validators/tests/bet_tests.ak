use aiken/interval
use cardano/assets
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}
use prediction_market/market_validation.{validate_bet}
use prediction_market/mocks.{
  mock_market_datum, mock_market_hash, mock_market_input, mock_market_value,
  mock_script_address, mock_transaction, mock_tx_id,
}
use prediction_market/types.{MarketDatum, No, Yes}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Build a valid bet transaction for YES direction
fn bet_yes_tx(datum: MarketDatum, amount: Int) -> Transaction {
  // Calculate expected tokens: yes_reserve - k / (no_reserve + amount)
  let tokens_out = datum.yes_reserve - datum.k / ( datum.no_reserve + amount )

  let new_datum =
    MarketDatum {
      ..datum,
      yes_reserve: datum.yes_reserve - tokens_out,
      no_reserve: datum.no_reserve + amount,
      total_yes_minted: datum.total_yes_minted + tokens_out,
      total_ada: datum.total_ada + amount,
    }

  Transaction {
    ..mock_transaction(),
    inputs: [mock_market_input(datum.total_ada)],
    outputs: [
      Output {
        address: mock_script_address(),
        value: mock_market_value(datum.total_ada + amount),
        datum: InlineDatum(new_datum),
        reference_script: None,
      },
    ],
    mint: assets.zero |> assets.add(mock_market_hash, "YES", tokens_out),
    validity_range: interval.between(0, datum.resolution_time),
  }
}

/// Build a valid bet transaction for NO direction
fn bet_no_tx(datum: MarketDatum, amount: Int) -> Transaction {
  let tokens_out = datum.no_reserve - datum.k / ( datum.yes_reserve + amount )

  let new_datum =
    MarketDatum {
      ..datum,
      yes_reserve: datum.yes_reserve + amount,
      no_reserve: datum.no_reserve - tokens_out,
      total_no_minted: datum.total_no_minted + tokens_out,
      total_ada: datum.total_ada + amount,
    }

  Transaction {
    ..mock_transaction(),
    inputs: [mock_market_input(datum.total_ada)],
    outputs: [
      Output {
        address: mock_script_address(),
        value: mock_market_value(datum.total_ada + amount),
        datum: InlineDatum(new_datum),
        reference_script: None,
      },
    ],
    mint: assets.zero |> assets.add(mock_market_hash, "NO", tokens_out),
    validity_range: interval.between(0, datum.resolution_time),
  }
}

fn mock_spend_ref() -> OutputReference {
  OutputReference { transaction_id: mock_tx_id, output_index: 0 }
}

// ── YES bet tests ────────────────────────────────────────────────────────────

test bet_yes_50_ada() {
  let datum = mock_market_datum()
  let tx = bet_yes_tx(datum, 50_000_000)
  validate_bet(datum, Yes, 50_000_000, mock_spend_ref(), tx)
}

test bet_yes_small_amount() {
  let datum = mock_market_datum()
  let tx = bet_yes_tx(datum, 1_000_000)
  validate_bet(datum, Yes, 1_000_000, mock_spend_ref(), tx)
}

// ── NO bet tests ─────────────────────────────────────────────────────────────

test bet_no_50_ada() {
  let datum = mock_market_datum()
  let tx = bet_no_tx(datum, 50_000_000)
  validate_bet(datum, No, 50_000_000, mock_spend_ref(), tx)
}

test bet_no_small_amount() {
  let datum = mock_market_datum()
  let tx = bet_no_tx(datum, 1_000_000)
  validate_bet(datum, No, 1_000_000, mock_spend_ref(), tx)
}

// ── Failure cases ────────────────────────────────────────────────────────────

test bet_zero_amount_fails() fail {
  let datum = mock_market_datum()
  let tx = bet_yes_tx(datum, 0)
  validate_bet(datum, Yes, 0, mock_spend_ref(), tx)
}

test bet_after_resolution_time_fails() fail {
  let datum = mock_market_datum()
  let tx =
    Transaction {
      ..bet_yes_tx(datum, 50_000_000),
      validity_range: // validity range past resolution time
      interval.between(300_001, 400_000),
    }
  validate_bet(datum, Yes, 50_000_000, mock_spend_ref(), tx)
}

test bet_on_resolved_market_fails() fail {
  let datum =
    MarketDatum {
      ..mock_market_datum(),
      resolved: True,
      winning_side: Some(Yes),
    }
  let tx = bet_yes_tx(datum, 50_000_000)
  validate_bet(datum, Yes, 50_000_000, mock_spend_ref(), tx)
}

test bet_wrong_mint_amount_fails() fail {
  let datum = mock_market_datum()
  // Build valid tx but tamper with mint amount
  let tx =
    Transaction {
      ..bet_yes_tx(datum, 50_000_000),
      mint: assets.zero |> assets.add(mock_market_hash, "YES", 999_999),
    }
  validate_bet(datum, Yes, 50_000_000, mock_spend_ref(), tx)
}

test bet_wrong_datum_update_fails() fail {
  let datum = mock_market_datum()
  // Build tx with wrong output datum (reserves not updated)
  let tokens_out =
    datum.yes_reserve - datum.k / ( datum.no_reserve + 50_000_000 )
  let tx =
    Transaction {
      ..mock_transaction(),
      inputs: [mock_market_input(datum.total_ada)],
      outputs: [
        Output {
          address: mock_script_address(),
          value: mock_market_value(datum.total_ada + 50_000_000),
          datum: InlineDatum(datum),
          reference_script: None,
        },
      ],
      mint: assets.zero |> assets.add(mock_market_hash, "YES", tokens_out),
      validity_range: interval.between(0, datum.resolution_time),
    }
  validate_bet(datum, Yes, 50_000_000, mock_spend_ref(), tx)
}

test bet_insufficient_ada_fails() fail {
  let datum = mock_market_datum()
  let tokens_out =
    datum.yes_reserve - datum.k / ( datum.no_reserve + 50_000_000 )
  let new_datum =
    MarketDatum {
      ..datum,
      yes_reserve: datum.yes_reserve - tokens_out,
      no_reserve: datum.no_reserve + 50_000_000,
      total_yes_minted: datum.total_yes_minted + tokens_out,
      total_ada: datum.total_ada + 50_000_000,
    }
  let tx =
    Transaction {
      ..mock_transaction(),
      inputs: [mock_market_input(datum.total_ada)],
      outputs: [
        Output {
          address: mock_script_address(),
          // Not enough ADA added
          value: mock_market_value(datum.total_ada + 1),
          datum: InlineDatum(new_datum),
          reference_script: None,
        },
      ],
      mint: assets.zero |> assets.add(mock_market_hash, "YES", tokens_out),
      validity_range: interval.between(0, datum.resolution_time),
    }
  validate_bet(datum, Yes, 50_000_000, mock_spend_ref(), tx)
}

test bet_missing_state_thread_in_output_fails() fail {
  let datum = mock_market_datum()
  let tokens_out =
    datum.yes_reserve - datum.k / ( datum.no_reserve + 50_000_000 )
  let new_datum =
    MarketDatum {
      ..datum,
      yes_reserve: datum.yes_reserve - tokens_out,
      no_reserve: datum.no_reserve + 50_000_000,
      total_yes_minted: datum.total_yes_minted + tokens_out,
      total_ada: datum.total_ada + 50_000_000,
    }
  let tx =
    Transaction {
      ..mock_transaction(),
      inputs: [mock_market_input(datum.total_ada)],
      outputs: [
        Output {
          address: mock_script_address(),
          value: assets.from_lovelace(datum.total_ada + 50_000_000),
          datum: InlineDatum(new_datum),
          reference_script: None,
        },
      ],
      mint: assets.zero |> assets.add(mock_market_hash, "YES", tokens_out),
      validity_range: interval.between(0, datum.resolution_time),
    }
  validate_bet(datum, Yes, 50_000_000, mock_spend_ref(), tx)
}
