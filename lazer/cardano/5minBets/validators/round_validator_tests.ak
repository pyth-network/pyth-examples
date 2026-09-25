use aiken/collection/dict
use aiken/interval.{Finite, Interval, IntervalBound}
use cardano/address.{Address, from_script, from_verification_key}
use cardano/assets.{from_lovelace, zero}
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Transaction,
}
use round_validator.{validate}
use types.{
  Bet, Claim, Down, Draw, Open, PlaceBet, Refund, RoundDatum, Settle, Settled,
  Up, Void, xau_usd_feed_id,
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const relayer: ByteArray = #"aa"

const bettor_a: ByteArray = #"bb"

const bettor_b: ByteArray = #"cc"

const s_hash: ByteArray = #"dd"

const deadline: Int = 1000000

const open_price: Int = 300000000000

fn mock_ref(idx: Int) -> OutputReference {
  OutputReference { transaction_id: #"0011", output_index: idx }
}

fn s_addr() -> Address {
  from_script(s_hash)
}

/// Construct a Transaction with Finite validity bounds and specific signatories.
fn mock_tx(
  inputs: List<Input>,
  outputs: List<Output>,
  signatories: List<ByteArray>,
  lower_ms: Int,
  upper_ms: Int,
) -> Transaction {
  Transaction {
    inputs,
    reference_inputs: [],
    outputs,
    fee: 0,
    mint: zero,
    certificates: [],
    withdrawals: [],
    validity_range: Interval {
      lower_bound: IntervalBound {
        bound_type: Finite(lower_ms),
        is_inclusive: True,
      },
      upper_bound: IntervalBound {
        bound_type: Finite(upper_ms),
        is_inclusive: True,
      },
    },
    extra_signatories: signatories,
    redeemers: [],
    datums: dict.empty,
    id: #"0011",
    votes: [],
    proposal_procedures: [],
    current_treasury_amount: None,
    treasury_donation: None,
  }
}

/// Build the script UTxO input being spent.
fn script_in(datum: RoundDatum, lovelace: Int) -> Input {
  Input {
    output_reference: mock_ref(0),
    output: Output {
      address: s_addr(),
      value: from_lovelace(lovelace),
      datum: InlineDatum(datum),
      reference_script: None,
    },
  }
}

/// Build a continued script output.
fn script_out(datum: RoundDatum, lovelace: Int) -> Output {
  Output {
    address: s_addr(),
    value: from_lovelace(lovelace),
    datum: InlineDatum(datum),
    reference_script: None,
  }
}

/// Build a plain verification-key output (for payouts).
fn bettor_out(vkh: ByteArray, lovelace: Int) -> Output {
  Output {
    address: from_verification_key(vkh),
    value: from_lovelace(lovelace),
    datum: NoDatum,
    reference_script: None,
  }
}

/// Open round with no bets.
fn d_open() -> RoundDatum {
  RoundDatum {
    feed_id: xau_usd_feed_id,
    relayer,
    open_price,
    close_price: None,
    status: Open,
    deadline_ms: deadline,
    bets: [],
    claimed: [],
  }
}

/// Open round with one UP bet and one DOWN bet.
fn d_with_bets() -> RoundDatum {
  RoundDatum {
    ..d_open(),
    bets: [
      Bet { bettor: bettor_a, side: Up, amount: 10000000 },
      Bet { bettor: bettor_b, side: Down, amount: 5000000 },
    ],
  }
}

/// Settled round where UP won.
fn d_settled_up() -> RoundDatum {
  RoundDatum {
    ..d_with_bets(),
    close_price: Some(310000000000),
    status: Settled { winner: Up },
    claimed: [],
  }
}

// ---------------------------------------------------------------------------
// PlaceBet tests
// ---------------------------------------------------------------------------

test place_bet_valid() {
  let d = d_open()
  let bet_amount = 5000000
  let new_d =
    RoundDatum {
      ..d,
      bets: [Bet { bettor: bettor_a, side: Up, amount: bet_amount }],
    }
  let tx =
    mock_tx(
      [script_in(d, 2000000)],
      [script_out(new_d, 2000000 + bet_amount)],
      [bettor_a],
      0,
      800000,
    )
  validate(Some(d), PlaceBet { bettor: bettor_a, side: Up }, mock_ref(0), tx)
}

test place_bet_after_deadline_fails() fail {
  let d = d_open()
  let bet_amount = 5000000
  let new_d =
    RoundDatum {
      ..d,
      bets: [Bet { bettor: bettor_a, side: Up, amount: bet_amount }],
    }
  // upper_ms (1500000) > deadline (1000000) — must fail
  let tx =
    mock_tx(
      [script_in(d, 2000000)],
      [script_out(new_d, 2000000 + bet_amount)],
      [bettor_a],
      1200000,
      1500000,
    )
  validate(Some(d), PlaceBet { bettor: bettor_a, side: Up }, mock_ref(0), tx)
}

test place_bet_unsigned_fails() fail {
  let d = d_open()
  let bet_amount = 5000000
  let new_d =
    RoundDatum {
      ..d,
      bets: [Bet { bettor: bettor_a, side: Up, amount: bet_amount }],
    }
  let tx =
    mock_tx(
      [script_in(d, 2000000)],
      [script_out(new_d, 2000000 + bet_amount)],
      [],
      0,
      800000,
    )
  validate(Some(d), PlaceBet { bettor: bettor_a, side: Up }, mock_ref(0), tx)
}

test place_bet_wrong_feed_id_fails() fail {
  // feed_id mismatch — validator must reject at the top-level guard
  let d = RoundDatum { ..d_open(), feed_id: 99 }
  let tx = mock_tx([], [], [bettor_a], 0, 800000)
  validate(Some(d), PlaceBet { bettor: bettor_a, side: Up }, mock_ref(0), tx)
}

// H5: bet below 2 ADA minimum must be rejected
test place_bet_below_minimum_fails() fail {
  let d = d_open()
  let bet_amount = 1
  let new_d =
    RoundDatum {
      ..d,
      bets: [Bet { bettor: bettor_a, side: Up, amount: bet_amount }],
    }
  let tx =
    mock_tx(
      [script_in(d, 2000000)],
      [script_out(new_d, 2000000 + bet_amount)],
      [bettor_a],
      0,
      800000,
    )
  validate(Some(d), PlaceBet { bettor: bettor_a, side: Up }, mock_ref(0), tx)
}

// ---------------------------------------------------------------------------
// Settle tests
// ---------------------------------------------------------------------------

test settle_up_wins() {
  let d = d_with_bets()
  let close = 310000000000
  let new_d =
    RoundDatum {
      ..d,
      close_price: Some(close),
      status: Settled { winner: Up },
      claimed: [],
    }
  let tx =
    mock_tx(
      [script_in(d, 2000000)],
      [script_out(new_d, 2000000)],
      [relayer],
      1100000,
      2000000,
    )
  validate(Some(d), Settle { close_price: close }, mock_ref(0), tx)
}

test settle_down_wins() {
  let d = d_with_bets()
  let close = 290000000000
  let new_d =
    RoundDatum {
      ..d,
      close_price: Some(close),
      status: Settled { winner: Down },
      claimed: [],
    }
  let tx =
    mock_tx(
      [script_in(d, 2000000)],
      [script_out(new_d, 2000000)],
      [relayer],
      1100000,
      2000000,
    )
  validate(Some(d), Settle { close_price: close }, mock_ref(0), tx)
}

test settle_draw() {
  let d = d_with_bets()
  let close = open_price
  let new_d =
    RoundDatum { ..d, close_price: Some(close), status: Draw, claimed: [] }
  let tx =
    mock_tx(
      [script_in(d, 2000000)],
      [script_out(new_d, 2000000)],
      [relayer],
      1100000,
      2000000,
    )
  validate(Some(d), Settle { close_price: close }, mock_ref(0), tx)
}

test settle_void_when_no_up_bets() {
  // Only DOWN bets → round must become Void regardless of price movement
  let d =
    RoundDatum {
      ..d_open(),
      bets: [Bet { bettor: bettor_b, side: Down, amount: 5000000 }],
    }
  let close = 310000000000
  let new_d =
    RoundDatum { ..d, close_price: Some(close), status: Void, claimed: [] }
  let tx =
    mock_tx(
      [script_in(d, 2000000)],
      [script_out(new_d, 2000000)],
      [relayer],
      1100000,
      2000000,
    )
  validate(Some(d), Settle { close_price: close }, mock_ref(0), tx)
}

test settle_before_deadline_fails() fail {
  let d = d_with_bets()
  let close = 310000000000
  let new_d =
    RoundDatum {
      ..d,
      close_price: Some(close),
      status: Settled { winner: Up },
      claimed: [],
    }
  // lower_ms (0) < deadline (1000000) — must fail
  let tx =
    mock_tx(
      [script_in(d, 2000000)],
      [script_out(new_d, 2000000)],
      [relayer],
      0,
      800000,
    )
  validate(Some(d), Settle { close_price: close }, mock_ref(0), tx)
}

test settle_relayer_unsigned_fails() fail {
  let d = d_with_bets()
  let close = 310000000000
  let new_d =
    RoundDatum {
      ..d,
      close_price: Some(close),
      status: Settled { winner: Up },
      claimed: [],
    }
  let tx =
    mock_tx(
      [script_in(d, 2000000)],
      [script_out(new_d, 2000000)],
      [],
      1100000,
      2000000,
    )
  validate(Some(d), Settle { close_price: close }, mock_ref(0), tx)
}

// M3: settling a round with no bets must be rejected
test settle_empty_round_fails() fail {
  let d = d_open()
  let close = 310000000000
  let new_d =
    RoundDatum { ..d, close_price: Some(close), status: Void, claimed: [] }
  let tx =
    mock_tx(
      [script_in(d, 2000000)],
      [script_out(new_d, 2000000)],
      [relayer],
      1100000,
      2000000,
    )
  validate(Some(d), Settle { close_price: close }, mock_ref(0), tx)
}

// ---------------------------------------------------------------------------
// Claim tests
// ---------------------------------------------------------------------------

// bettor_a staked 10_000_000 on UP; total pool = 15_000_000; winner_pool = 10_000_000
// gross = 10_000_000 * 15_000_000 / 10_000_000 = 15_000_000
// fee   = 15_000_000 * 200 / 10_000  = 300_000
// net   = 14_700_000
const expected_payout_a: Int = 14700000

test claim_winner_valid() {
  let d = d_settled_up()
  let new_d = RoundDatum { ..d, claimed: [bettor_a] }
  let pool_lovelace = 17000000
  let tx =
    mock_tx(
      [script_in(d, pool_lovelace)],
      [
        bettor_out(bettor_a, expected_payout_a),
        script_out(new_d, pool_lovelace - expected_payout_a),
      ],
      [bettor_a],
      1100000,
      2000000,
    )
  validate(Some(d), Claim { bettor: bettor_a }, mock_ref(0), tx)
}

test claim_loser_fails() fail {
  // bettor_b bet DOWN but UP won — claim must fail
  let d = d_settled_up()
  let new_d = RoundDatum { ..d, claimed: [bettor_b] }
  let tx =
    mock_tx(
      [script_in(d, 17000000)],
      [bettor_out(bettor_b, 5000000), script_out(new_d, 12000000)],
      [bettor_b],
      1100000,
      2000000,
    )
  validate(Some(d), Claim { bettor: bettor_b }, mock_ref(0), tx)
}

test claim_already_claimed_fails() fail {
  // bettor_a already in claimed list — must fail
  let d = RoundDatum { ..d_settled_up(), claimed: [bettor_a] }
  let tx =
    mock_tx(
      [script_in(d, 17000000)],
      [script_out(d, 17000000)],
      [bettor_a],
      1100000,
      2000000,
    )
  validate(Some(d), Claim { bettor: bettor_a }, mock_ref(0), tx)
}

test claim_underpaid_fails() fail {
  let d = d_settled_up()
  let new_d = RoundDatum { ..d, claimed: [bettor_a] }
  let underpaid = expected_payout_a - 1
  let tx =
    mock_tx(
      [script_in(d, 17000000)],
      [bettor_out(bettor_a, underpaid), script_out(new_d, 17000000 - underpaid)],
      [bettor_a],
      1100000,
      2000000,
    )
  validate(Some(d), Claim { bettor: bettor_a }, mock_ref(0), tx)
}

// C4: attacker pays winner the expected amount from their own wallet but drains
// the script output to zero — script_value_ok guard must catch this
test claim_overdrain_fails() fail {
  let d = d_settled_up()
  let new_d = RoundDatum { ..d, claimed: [bettor_a] }
  let pool_lovelace = 17000000
  // Script output is 0 — entire pool stolen by attacker
  let tx =
    mock_tx(
      [script_in(d, pool_lovelace)],
      [bettor_out(bettor_a, expected_payout_a), script_out(new_d, 0)],
      [bettor_a],
      1100000,
      2000000,
    )
  validate(Some(d), Claim { bettor: bettor_a }, mock_ref(0), tx)
}

// ---------------------------------------------------------------------------
// Refund tests
// ---------------------------------------------------------------------------

test refund_draw_valid() {
  let d =
    RoundDatum {
      ..d_with_bets(),
      close_price: Some(open_price),
      status: Draw,
      claimed: [],
    }
  let stake_a = 10000000
  let new_d = RoundDatum { ..d, claimed: [bettor_a] }
  let pool = 17000000
  let tx =
    mock_tx(
      [script_in(d, pool)],
      [bettor_out(bettor_a, stake_a), script_out(new_d, pool - stake_a)],
      [bettor_a],
      1100000,
      2000000,
    )
  validate(Some(d), Refund { bettor: bettor_a }, mock_ref(0), tx)
}

test refund_void_valid() {
  let d =
    RoundDatum {
      ..d_open(),
      bets: [Bet { bettor: bettor_a, side: Down, amount: 5000000 }],
      close_price: Some(310000000000),
      status: Void,
      claimed: [],
    }
  let new_d = RoundDatum { ..d, claimed: [bettor_a] }
  let tx =
    mock_tx(
      [script_in(d, 7000000)],
      [bettor_out(bettor_a, 5000000), script_out(new_d, 2000000)],
      [bettor_a],
      1100000,
      2000000,
    )
  validate(Some(d), Refund { bettor: bettor_a }, mock_ref(0), tx)
}

test refund_from_settled_round_fails() fail {
  // Settled round is not refundable
  let d = d_settled_up()
  let new_d = RoundDatum { ..d, claimed: [bettor_a] }
  let tx =
    mock_tx(
      [script_in(d, 17000000)],
      [bettor_out(bettor_a, 10000000), script_out(new_d, 7000000)],
      [bettor_a],
      1100000,
      2000000,
    )
  validate(Some(d), Refund { bettor: bettor_a }, mock_ref(0), tx)
}

test refund_already_refunded_fails() fail {
  let d =
    RoundDatum {
      ..d_with_bets(),
      close_price: Some(open_price),
      status: Draw,
      claimed: [bettor_a],
    }
  let tx =
    mock_tx(
      [script_in(d, 17000000)],
      [bettor_out(bettor_a, 10000000), script_out(d, 7000000)],
      [bettor_a],
      1100000,
      2000000,
    )
  validate(Some(d), Refund { bettor: bettor_a }, mock_ref(0), tx)
}

// C4: same pool-drain attack on Refund
test refund_overdrain_fails() fail {
  let d =
    RoundDatum {
      ..d_with_bets(),
      close_price: Some(open_price),
      status: Draw,
      claimed: [],
    }
  let stake_a = 10000000
  let new_d = RoundDatum { ..d, claimed: [bettor_a] }
  let pool = 17000000
  // Script output is 0 — rest of pool stolen by attacker
  let tx =
    mock_tx(
      [script_in(d, pool)],
      [bettor_out(bettor_a, stake_a), script_out(new_d, 0)],
      [bettor_a],
      1100000,
      2000000,
    )
  validate(Some(d), Refund { bettor: bettor_a }, mock_ref(0), tx)
}
