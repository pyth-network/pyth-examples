use aiken/collection/dict
use aiken/interval
use cardano/address.{Address, Script, VerificationKey}
use cardano/assets
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction,
}
use prediction_market/types.{MarketDatum}

// ── Mock constants ───────────────────────────────────────────────────────────

pub const mock_creator_vkh =
  #"01010101010101010101010101010101010101010101010101010101"

pub const mock_market_hash =
  #"aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd"

pub const mock_pyth_id =
  #"55667788556677885566778855667788556677885566778855667788"

pub const mock_tx_id =
  #"0000000000000000000000000000000000000000000000000000000000000000"

// BTC/USD Pyth feed ID
pub const mock_feed_id = 1

// ── Mock builders ────────────────────────────────────────────────────────────

pub fn mock_creator_address() -> Address {
  Address {
    payment_credential: VerificationKey(mock_creator_vkh),
    stake_credential: None,
  }
}

pub fn mock_script_address() -> Address {
  Address {
    payment_credential: Script(mock_market_hash),
    stake_credential: None,
  }
}

pub fn mock_market_datum() -> MarketDatum {
  MarketDatum {
    creator: mock_creator_vkh,
    pyth_id: mock_pyth_id,
    feed_id: mock_feed_id,
    target_price: 5_000_000_000_000,
    resolution_time: 300_000,
    token_policy: mock_market_hash,
    yes_reserve: 100_000_000,
    no_reserve: 100_000_000,
    k: 10_000_000_000_000_000,
    total_yes_minted: 100_000_000,
    total_no_minted: 100_000_000,
    total_ada: 100_000_000,
    resolved: False,
    winning_side: None,
  }
}

pub fn mock_market_value(lovelace: Int) -> assets.Value {
  assets.from_lovelace(lovelace)
    |> assets.add(mock_market_hash, "", 1)
}

pub fn mock_market_input(lovelace: Int) -> Input {
  Input {
    output_reference: OutputReference {
      transaction_id: mock_tx_id,
      output_index: 0,
    },
    output: Output {
      address: mock_script_address(),
      value: mock_market_value(lovelace),
      datum: InlineDatum(mock_market_datum()),
      reference_script: None,
    },
  }
}

pub fn mock_market_output(datum: MarketDatum, lovelace: Int) -> Output {
  Output {
    address: mock_script_address(),
    value: mock_market_value(lovelace),
    datum: InlineDatum(datum),
    reference_script: None,
  }
}

pub fn mock_transaction() -> Transaction {
  Transaction {
    inputs: [],
    reference_inputs: [],
    outputs: [],
    fee: 0,
    mint: assets.zero,
    certificates: [],
    withdrawals: [],
    validity_range: interval.between(0, 100_000),
    extra_signatories: [],
    redeemers: [],
    datums: dict.empty,
    id: mock_tx_id,
    votes: [],
    proposal_procedures: [],
    current_treasury_amount: None,
    treasury_donation: None,
  }
}
