use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval.{Finite}
use cardano/address.{Address, VerificationKey}
use cardano/assets.{lovelace_of}
use cardano/script_context.{ScriptContext}
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction,
}
use types.{
  Action, Bet, Claim, Down, Draw, Open, PlaceBet, Refund, RoundDatum, Settle,
  Settled, Up, Void, min_bet_lovelace, xau_usd_feed_id,
}
use utils

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn find_own_input(inputs: List<Input>, own_ref: OutputReference) -> Option<Input> {
  list.find(inputs, fn(i) { i.output_reference == own_ref })
}

fn find_script_output(outputs: List<Output>, script_addr: Address) -> Option<Output> {
  list.find(outputs, fn(o) { o.address == script_addr })
}

/// Total lovelace sent to a verification-key address in this transaction.
fn bettor_received(outputs: List<Output>, vkh: VerificationKeyHash) -> Int {
  outputs
    |> list.filter(
        fn(o) {
          when o.address.payment_credential is {
            VerificationKey(k) -> k == vkh
            _ -> False
          }
        },
      )
    |> list.foldl(0, fn(o, acc) { acc + lovelace_of(o.value) })
}

/// Decode an inline datum from an output as a RoundDatum.
fn decode_datum(output: Output) -> RoundDatum {
  expect InlineDatum(raw) = output.datum
  expect d: RoundDatum = raw
  d
}

// ---------------------------------------------------------------------------
// Core validation logic (extracted for testability)
// ---------------------------------------------------------------------------

pub fn validate(
  datum: Option<RoundDatum>,
  redeemer: Action,
  own_ref: OutputReference,
  self: Transaction,
) -> Bool {
  expect Some(d) = datum

  // Reject any round not tracking the XAU/USD Pyth Lazer feed.
  expect d.feed_id == xau_usd_feed_id

  expect Some(own_input) = find_own_input(self.inputs, own_ref)
  let script_address = own_input.output.address
  let own_lovelace = lovelace_of(own_input.output.value)

  when redeemer is {
    // -----------------------------------------------------------------------
    // PlaceBet — user locks ADA at the script and records their bet choice
    //
    // Checks:
    //   • Round is Open
    //   • Transaction upper-bound is at or before the deadline
    //   • Bettor has signed the transaction
    //   • Continued script output carries the updated datum (bet appended)
    //   • Continued output value increased by the bet amount
    // -----------------------------------------------------------------------
    PlaceBet { bettor, side } -> {
      expect Open = d.status

      let before_deadline =
        when self.validity_range.upper_bound.bound_type is {
          Finite(t) -> t <= d.deadline_ms
          _ -> False
        }

      let bettor_signed = list.has(self.extra_signatories, bettor)

      expect Some(cont_out) = find_script_output(self.outputs, script_address)
      let new_d = decode_datum(cont_out)

      let bet_amount = lovelace_of(cont_out.value) - own_lovelace
      let new_bet = Bet { bettor, side, amount: bet_amount }

      let datum_ok =
        new_d.feed_id == xau_usd_feed_id && new_d.relayer == d.relayer && new_d.open_price == d.open_price && new_d.close_price == None && new_d.status == Open && new_d.deadline_ms == d.deadline_ms && new_d.bets == list.concat(
          d.bets,
          [new_bet],
        ) && new_d.claimed == d.claimed

      before_deadline && bettor_signed && bet_amount >= min_bet_lovelace && datum_ok
    }

    // -----------------------------------------------------------------------
    // Settle — relayer submits the Pyth closing price after the deadline
    //
    // Checks:
    //   • Round is Open
    //   • Transaction lower-bound is at or after the deadline
    //   • Relayer has signed the transaction
    //   • Continued output records close_price and updated status
    //
    // NOTE: In production, verify close_price against a Pyth reference input
    //       rather than trusting the relayer unconditionally.
    // -----------------------------------------------------------------------
    Settle { close_price } -> {
      expect Open = d.status

      let after_deadline =
        when self.validity_range.lower_bound.bound_type is {
          Finite(t) -> t >= d.deadline_ms
          _ -> False
        }

      let relayer_signed = list.has(self.extra_signatories, d.relayer)

      expect Some(cont_out) = find_script_output(self.outputs, script_address)
      let new_d = decode_datum(cont_out)

      // M3: Require at least one bet before settlement.
      expect utils.total_pool(d.bets) > 0

      // If one side has no bets, the round is voided instead of settled.
      let up_pool = utils.side_pool(d.bets, Up)
      let down_pool = utils.side_pool(d.bets, Down)
      let new_status =
        if up_pool == 0 || down_pool == 0 {
          Void
        } else {
          when utils.determine_winner(d.open_price, close_price) is {
            Some(winner) -> Settled { winner }
            None -> Draw
          }
        }

      let datum_ok =
        new_d.feed_id == xau_usd_feed_id && new_d.relayer == d.relayer && new_d.open_price == d.open_price && new_d.close_price == Some(
          close_price,
        ) && new_d.status == new_status && new_d.deadline_ms == d.deadline_ms && new_d.bets == d.bets && new_d.claimed == []

      after_deadline && relayer_signed && datum_ok
    }

    // -----------------------------------------------------------------------
    // Claim — a winner collects their share of the pool
    //
    // Checks:
    //   • Round is Settled and bettor bet on the winning side
    //   • Bettor has not already claimed
    //   • Bettor receives at least their net_payout (proportional, minus fee)
    //   • Continued datum records bettor as claimed
    // -----------------------------------------------------------------------
    Claim { bettor } -> {
      expect Settled { winner } = d.status

      let bettor_signed = list.has(self.extra_signatories, bettor)
      let not_yet_claimed = !list.has(d.claimed, bettor)

      expect Some(bet) =
        list.find(d.bets, fn(b) { b.bettor == bettor && b.side == winner })

      let winner_pool = utils.side_pool(d.bets, winner)
      let total = utils.total_pool(d.bets)
      let expected = utils.net_payout(bet.amount, winner_pool, total)

      let paid = bettor_received(self.outputs, bettor)

      expect Some(cont_out) = find_script_output(self.outputs, script_address)
      let new_d = decode_datum(cont_out)

      let datum_ok =
        new_d.feed_id == xau_usd_feed_id && new_d.relayer == d.relayer && new_d.open_price == d.open_price && new_d.close_price == d.close_price && new_d.status == d.status && new_d.deadline_ms == d.deadline_ms && new_d.bets == d.bets && new_d.claimed == list.concat(
          d.claimed,
          [bettor],
        )

      // C4: Script output must lose exactly the claimed amount — no pool drain.
      let script_value_ok = lovelace_of(cont_out.value) >= own_lovelace - expected

      bettor_signed && not_yet_claimed && paid >= expected && script_value_ok && datum_ok
    }

    // -----------------------------------------------------------------------
    // Refund — a bettor recovers their full stake from a Draw or Void round
    //
    // Checks:
    //   • Round is in a refundable state (Draw or Void)
    //   • Bettor has not already been refunded
    //   • Bettor receives at least their original stake back
    //   • Continued datum records bettor as claimed
    // -----------------------------------------------------------------------
    Refund { bettor } -> {
      let is_refundable =
        when d.status is {
          Draw -> True
          Void -> True
          _ -> False
        }

      let bettor_signed = list.has(self.extra_signatories, bettor)
      let not_yet_claimed = !list.has(d.claimed, bettor)

      expect Some(bet) = list.find(d.bets, fn(b) { b.bettor == bettor })

      let paid = bettor_received(self.outputs, bettor)

      expect Some(cont_out) = find_script_output(self.outputs, script_address)
      let new_d = decode_datum(cont_out)

      let datum_ok =
        new_d.feed_id == xau_usd_feed_id && new_d.relayer == d.relayer && new_d.open_price == d.open_price && new_d.close_price == d.close_price && new_d.status == d.status && new_d.deadline_ms == d.deadline_ms && new_d.bets == d.bets && new_d.claimed == list.concat(
          d.claimed,
          [bettor],
        )

      // C4: Script output must lose exactly the refunded stake — no pool drain.
      let script_value_ok = lovelace_of(cont_out.value) >= own_lovelace - bet.amount

      is_refundable && bettor_signed && not_yet_claimed && paid >= bet.amount && script_value_ok && datum_ok
    }
  }
}

// ---------------------------------------------------------------------------
// Validator entry point
// ---------------------------------------------------------------------------

validator round_validator {
  spend(
    datum: Option<RoundDatum>,
    redeemer: Action,
    own_ref: OutputReference,
    self: Transaction,
  ) {
    validate(datum, redeemer, own_ref, self)
  }

  else(_ctx: ScriptContext) {
    False
  }
}
