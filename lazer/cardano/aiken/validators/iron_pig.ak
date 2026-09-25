use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval.{Finite, Interval, before}
use cardano/address.{Script, from_script, from_verification_key}
use cardano/assets.{AssetName, PolicyId, Value, add, from_lovelace}
use cardano/script_context.{ScriptContext}
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Transaction, find_input,
  find_script_outputs, placeholder,
}
use iron_pig_logic.{
  Deposit, IronPigDatum, PigRedeemer, Withdraw,
  value_covers, value_paid_to, vault_total_micro_usd,
}
use pyth.{Governance, Pyth}
use types/u32
use types/u64

/// Max age (ms) between Pyth update timestamp and tx validity upper bound.
const max_oracle_age_ms: Int = 60_000

validator iron_pig(stable_assets: List<(PolicyId, AssetName)>) {
  spend(
    datum_opt: Option<IronPigDatum>,
    redeemer: PigRedeemer,
    utxo: OutputReference,
    self: Transaction,
  ) {
    expect Some(datum) = datum_opt
    expect Some(own_input) = find_input(self.inputs, utxo)
    expect Script(vault_hash) = own_input.output.address.payment_credential

    let vault_inputs =
      list.filter(
        self.inputs,
        fn(i) {
          i.output.address.payment_credential == Script(vault_hash)
        },
      )
    expect True = (list.length(vault_inputs) == 1)?

    when redeemer is {
      Deposit -> {
        let continuing = find_script_outputs(self.outputs, vault_hash)
        when continuing is {
          [out] -> {
            expect Script(out_hash) = out.address.payment_credential
            expect InlineDatum(datum_data) = out.datum
            expect continued: IronPigDatum = datum_data
            and {
              (out_hash == vault_hash)?,
              (continued == datum)?,
              value_covers(own_input.output.value, out.value)?,
              (out.value != own_input.output.value)?,
            }
          }
          _ -> False
        }
      }
      Withdraw ->
        if !list.has(self.extra_signatories, datum.owner) {
          False
        } else {
          expect [update] = pyth.get_updates(datum.pyth_policy_id, self)
          expect Some(feed) =
            list.find(
              update.feeds,
              fn(f) { u32.as_int(f.feed_id) == datum.ada_usd_feed_id },
            )
          expect Some(Some(price)) = feed.price
          expect Some(expo) = feed.exponent
          let update_ms = u64.as_int(update.timestamp_us) / 1000
          let total =
            vault_total_micro_usd(
              own_input.output.value,
              stable_assets,
              price,
              expo,
            )
          let owner_addr = from_verification_key(datum.owner)
          let paid = value_paid_to(self.outputs, owner_addr)
          when self.validity_range.upper_bound.bound_type is {
            Finite(upper_ms) ->
              and {
                (upper_ms >= update_ms)?,
                (upper_ms - update_ms <= max_oracle_age_ms)?,
                (total >= datum.goal_micro_usd)?,
                (find_script_outputs(self.outputs, vault_hash) == [])?,
                value_covers(own_input.output.value, paid)?,
              }
            _ -> False
          }
        }
    }
  }

  else(_ctx: ScriptContext) {
    fail @"iron_pig only handles spend"
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────
// Withdraw tests use the Pyth Lazer flow: state ref input + 0-withdraw redeemer.
// The test_update payload comes from the pyth-lazer-cardano library's own test
// data (feeds 1, 2, 112). We pick feed_id = 2 for our ADA/USD in tests.

const pyth_pol: PolicyId =
  #"01010101010101010101010101010101010101010101010101010101"

const pyth_state_script: PolicyId =
  #"07070707070707070707070707070707070707070707070707070707"

const pyth_withdraw_script: PolicyId =
  #"08080808080808080808080808080808080808080808080808080808"

const usdc_pol: PolicyId =
  #"02020202020202020202020202020202020202020202020202020202"

const usdc_name: AssetName = #"55534443"

const owner_vkh: VerificationKeyHash =
  #"03030303030303030303030303030303030303030303030303030303"

const vault_hash_dummy: PolicyId =
  #"04040404040404040404040404040404040404040404040404040404"

/// Feed ID used in tests (matches feed 2 in the test_update payload).
const test_feed_id: Int = 2

fn vault_datum(goal: Int) -> IronPigDatum {
  IronPigDatum {
    goal_micro_usd: goal,
    owner: owner_vkh,
    pyth_policy_id: pyth_pol,
    ada_usd_feed_id: test_feed_id,
  }
}

fn stables() -> List<(PolicyId, AssetName)> {
  [(usdc_pol, usdc_name)]
}

fn pyth_state_datum() -> Pyth {
  Pyth {
    governance: Governance {
      wormhole: #"0000000000000000000000000000000000000000000000000000000000",
      emitter_chain: 0,
      emitter_address: #"",
      seen_sequence: 0,
    },
    trusted_signers: [],
    deprecated_withdraw_scripts: [],
    withdraw_script: pyth_withdraw_script,
  }
}

fn pyth_state_ref_input() -> Input {
  Input {
    output_reference: OutputReference {
      transaction_id: #"1111111111111111111111111111111111111111111111111111111111111111",
      output_index: 99,
    },
    output: Output {
      address: from_script(pyth_state_script),
      value: from_lovelace(2_000_000) |> add(pyth_pol, "Pyth State", 1),
      datum: InlineDatum(pyth_state_datum()),
      reference_script: None,
    },
  }
}

/// Signed update from pyth-lazer-cardano test suite (feeds 1, 2, 112).
/// Feed 2: price = 201300331620, exponent = -8 → ~$2013/token.
/// timestamp_us = 1772613309000000 → ms = 1772613309000
const test_update_msg: ByteArray =
  #"b9011a82db446efb9cf488be308398477ab37d650aeb3e06ad7e2424c31a97b4e318026486f544c2bbe17f85a3a158a4c8b628fa078066d7880b6bfbff8278139bf8e40380efc1f480c5615af3fb673d42287e993da9fbc3506b6e41dfa32950820c2e6cfe0075d3c79340699bb22e4c06000303010000000b00529a23605206000001b10d6c5e520600000280ba0b635206000004f8ff0600070008000900000a0008aa99440600000b20e4d495440600000c0140699bb22e4c0600020000000b00644c6fde2e0000000188a660de2e000000028a17ddde2e00000004f8ff0600070008000900000ae01c1a742e0000000b8898ec732e0000000c0140699bb22e4c0600700000000b00593e2c755106000001000000000000000002000000000000000004f4ff0601d809000000000000070129229ab22e4c0600080100209db4060000000900000a00000000000000000b00000000000000000c0140699bb22e4c0600"

const test_update_timestamp_ms: Int = 1772613309000

fn fresh_validity_range() -> Interval {
  before(test_update_timestamp_ms + 30_000)
}

fn script_output(hash: PolicyId, value: Value, d: IronPigDatum) -> Output {
  Output {
    address: from_script(hash),
    value,
    datum: InlineDatum(d),
    reference_script: None,
  }
}

/// Build a withdraw transaction with Pyth Lazer state ref + redeemer.
fn withdraw_tx(
  oref: OutputReference,
  locked: Value,
  datum: IronPigDatum,
  validity_range: Interval,
  extra_signatories: List<VerificationKeyHash>,
  outputs: List<Output>,
) -> Transaction {
  Transaction {
    ..placeholder,
    inputs: [
      Input {
        output_reference: oref,
        output: script_output(vault_hash_dummy, locked, datum),
      },
    ],
    reference_inputs: [pyth_state_ref_input()],
    outputs: outputs,
    validity_range: validity_range,
    extra_signatories: extra_signatories,
    redeemers: {
      let updates: Data = [test_update_msg]
      [Pair(transaction.Withdraw(Script(pyth_withdraw_script)), updates)]
    },
    withdrawals: [Pair(Script(pyth_withdraw_script), 0)],
  }
}

// ── Deposit tests ────────────────────────────────────────────────────────────

test deposit_preserves_datum_and_increases_value() {
  let goal = 1_000_000
  let datum = vault_datum(goal)
  let oref =
    OutputReference {
      transaction_id: #"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      output_index: 0,
    }
  let locked_in =
    from_lovelace(1_000_000)
      |> add(usdc_pol, usdc_name, 100_000)
  let locked_out =
    from_lovelace(5_000_000)
      |> add(usdc_pol, usdc_name, 200_000)
  let tx =
    Transaction {
      ..placeholder,
      inputs: [
        Input {
          output_reference: oref,
          output: script_output(vault_hash_dummy, locked_in, datum),
        },
      ],
      outputs: [script_output(vault_hash_dummy, locked_out, datum)],
    }
  iron_pig.spend(stables(), Some(datum), Deposit, oref, tx)
}

test deposit_rejects_noop_same_value() fail {
  let goal = 1_000_000
  let datum = vault_datum(goal)
  let oref =
    OutputReference {
      transaction_id: #"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      output_index: 0,
    }
  let v = from_lovelace(1_000_000)
  let tx =
    Transaction {
      ..placeholder,
      inputs: [
        Input {
          output_reference: oref,
          output: script_output(vault_hash_dummy, v, datum),
        },
      ],
      outputs: [script_output(vault_hash_dummy, v, datum)],
    }
  iron_pig.spend(stables(), Some(datum), Deposit, oref, tx)
}

// ── Withdraw tests ───────────────────────────────────────────────────────────
// Feed 2 from test_update: price ~$2013 with expo -8.
// 1 ADA (1_000_000 lovelace) → ~2_013_003_316 micro-USD ($2013).

test withdraw_succeeds_when_value_covers_goal() {
  let datum = vault_datum(1_000_000)
  let oref =
    OutputReference {
      transaction_id: #"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      output_index: 0,
    }
  let locked = from_lovelace(1_000_000)
  let tx =
    withdraw_tx(
      oref,
      locked,
      datum,
      fresh_validity_range(),
      [owner_vkh],
      [
        Output {
          address: from_verification_key(owner_vkh),
          value: locked,
          datum: NoDatum,
          reference_script: None,
        },
      ],
    )
  iron_pig.spend(stables(), Some(datum), Withdraw, oref, tx)
}

test withdraw_fails_below_goal() fail {
  // 1 ADA ≈ $2013 < $5M goal
  let datum = vault_datum(5_000_000_000_000)
  let oref =
    OutputReference {
      transaction_id: #"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      output_index: 0,
    }
  let locked = from_lovelace(1_000_000)
  let tx =
    withdraw_tx(
      oref,
      locked,
      datum,
      fresh_validity_range(),
      [owner_vkh],
      [
        Output {
          address: from_verification_key(owner_vkh),
          value: locked,
          datum: NoDatum,
          reference_script: None,
        },
      ],
    )
  iron_pig.spend(stables(), Some(datum), Withdraw, oref, tx)
}

test withdraw_fails_without_owner_signature() fail {
  let datum = vault_datum(1)
  let oref =
    OutputReference {
      transaction_id: #"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      output_index: 0,
    }
  let locked = from_lovelace(1_000_000)
  let tx =
    withdraw_tx(
      oref,
      locked,
      datum,
      fresh_validity_range(),
      [],
      [
        Output {
          address: from_verification_key(owner_vkh),
          value: locked,
          datum: NoDatum,
          reference_script: None,
        },
      ],
    )
  iron_pig.spend(stables(), Some(datum), Withdraw, oref, tx)
}

test withdraw_fails_when_oracle_too_stale() fail {
  let datum = vault_datum(1_000_000)
  let oref =
    OutputReference {
      transaction_id: #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      output_index: 0,
    }
  let locked = from_lovelace(1_000_000)
  let stale_range = before(test_update_timestamp_ms + max_oracle_age_ms + 1)
  let tx =
    withdraw_tx(
      oref,
      locked,
      datum,
      stale_range,
      [owner_vkh],
      [
        Output {
          address: from_verification_key(owner_vkh),
          value: locked,
          datum: NoDatum,
          reference_script: None,
        },
      ],
    )
  iron_pig.spend(stables(), Some(datum), Withdraw, oref, tx)
}

test withdraw_fails_when_not_paid_to_owner() fail {
  let datum = vault_datum(1_000_000)
  let oref =
    OutputReference {
      transaction_id: #"abababababababababababababababababababababababababababababababab",
      output_index: 0,
    }
  let locked = from_lovelace(1_000_000)
  let attacker_vkh: VerificationKeyHash =
    #"06060606060606060606060606060606060606060606060606060606"
  let tx =
    withdraw_tx(
      oref,
      locked,
      datum,
      fresh_validity_range(),
      [owner_vkh],
      [
        Output {
          address: from_verification_key(attacker_vkh),
          value: locked,
          datum: NoDatum,
          reference_script: None,
        },
      ],
    )
  iron_pig.spend(stables(), Some(datum), Withdraw, oref, tx)
}
