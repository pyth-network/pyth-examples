use cardano/address
use cardano/assets
use cardano/transaction.{Input, NoDatum, Output, OutputReference, Transaction}
use prediction_market/market_validation.{
  validate_burn_tokens, validate_mint_tokens,
}
use prediction_market/mocks.{
  mock_market_hash, mock_market_input, mock_transaction, mock_tx_id,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn mock_one_shot() -> OutputReference {
  OutputReference { transaction_id: mock_tx_id, output_index: 42 }
}

fn mock_one_shot_input() -> Input {
  Input {
    output_reference: mock_one_shot(),
    output: Output {
      address: address.Address {
        payment_credential: address.VerificationKey(
          #"01010101010101010101010101010101010101010101010101010101",
        ),
        stake_credential: None,
      },
      value: assets.from_lovelace(5_000_000),
      datum: NoDatum,
      reference_script: None,
    },
  }
}

fn fake_market_shaped_input() -> Input {
  Input {
    output_reference: OutputReference {
      transaction_id: mock_tx_id,
      output_index: 7,
    },
    output: Output {
      address: address.Address {
        payment_credential: address.Script(mock_market_hash),
        stake_credential: None,
      },
      value: assets.from_lovelace(100_000_000),
      datum: NoDatum,
      reference_script: None,
    },
  }
}

// ── MintTokens tests ─────────────────────────────────────────────────────────

test mint_with_one_shot() {
  let tx =
    Transaction {
      ..mock_transaction(),
      inputs: [mock_one_shot_input()],
      mint: assets.zero
        |> assets.add(mock_market_hash, "", 1)
        |> assets.add(mock_market_hash, "YES", 100_000_000)
        |> assets.add(mock_market_hash, "NO", 100_000_000),
    }
  validate_mint_tokens(mock_one_shot(), mock_market_hash, tx)
}

test mint_with_market_spend() {
  let tx =
    Transaction {
      ..mock_transaction(),
      inputs: [mock_market_input(100_000_000)],
      mint: assets.zero |> assets.add(mock_market_hash, "YES", 50_000_000),
    }
  validate_mint_tokens(mock_one_shot(), mock_market_hash, tx)
}

test mint_without_one_shot_or_market_input_fails() fail {
  // No one_shot UTxO consumed and no market script input
  let tx =
    Transaction {
      ..mock_transaction(),
      inputs: [mock_one_shot_input()],
      mint: assets.zero |> assets.add(mock_market_hash, "YES", 100_000_000),
    }
  // Use a different one_shot that isn't in inputs
  let wrong_one_shot =
    OutputReference {
      transaction_id: #"1111111111111111111111111111111111111111111111111111111111111111",
      output_index: 0,
    }
  validate_mint_tokens(wrong_one_shot, mock_market_hash, tx)
}

test mint_with_fake_market_shaped_input_fails() fail {
  let tx =
    Transaction {
      ..mock_transaction(),
      inputs: [fake_market_shaped_input()],
      mint: assets.zero |> assets.add(mock_market_hash, "YES", 50_000_000),
    }
  validate_mint_tokens(mock_one_shot(), mock_market_hash, tx)
}

test mint_with_one_shot_missing_state_thread_fails() fail {
  let tx =
    Transaction {
      ..mock_transaction(),
      inputs: [mock_one_shot_input()],
      mint: assets.zero
        |> assets.add(mock_market_hash, "YES", 100_000_000)
        |> assets.add(mock_market_hash, "NO", 100_000_000),
    }
  validate_mint_tokens(mock_one_shot(), mock_market_hash, tx)
}

// ── BurnTokens tests ─────────────────────────────────────────────────────────

test burn_valid() {
  let tx =
    Transaction {
      ..mock_transaction(),
      mint: assets.zero
        |> assets.add(mock_market_hash, "YES", -50_000_000)
        |> assets.add(mock_market_hash, "NO", -10_000_000),
    }
  validate_burn_tokens(mock_market_hash, tx)
}

test burn_positive_amount_fails() fail {
  let tx =
    Transaction {
      ..mock_transaction(),
      mint: // One positive mint — should fail burn validation
      assets.zero
        |> assets.add(mock_market_hash, "YES", 50_000_000),
    }
  validate_burn_tokens(mock_market_hash, tx)
}

test burn_mixed_amounts_fails() fail {
  let tx =
    Transaction {
      ..mock_transaction(),
      mint: // One negative, one positive — should fail
      assets.zero
        |> assets.add(mock_market_hash, "YES", -50_000_000)
        |> assets.add(mock_market_hash, "NO", 10_000_000),
    }
  validate_burn_tokens(mock_market_hash, tx)
}
