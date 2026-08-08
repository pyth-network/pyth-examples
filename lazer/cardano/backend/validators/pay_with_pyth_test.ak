use cardano/address
use cardano/assets
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Transaction, Withdraw,
  placeholder,
}
use pay_with_pyth.{Cancel, Unlock}
use pyth.{Governance, Pyth}

// -- Test constants --

const sponsor_key_hash =
  #"aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000001"

const user_key_hash =
  #"aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000002"

const pyth_policy_id =
  #"aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000003"

const withdraw_script_hash =
  #"aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000004"

const script_hash =
  #"aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000005"

/// Pyth update: ADA/USD price=75000000, exponent=-8 => $0.75/ADA
const pyth_update_075 =
  #"b9011a820000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001f0075d3c7930010a5d4e80000000301100000000200c06878040000000004f8ff"

/// Pyth update: ADA/USD price=50000000, exponent=-8 => $0.50/ADA
const pyth_update_050 =
  #"b9011a820000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001f0075d3c7930010a5d4e8000000030110000000020080f0fa020000000004f8ff"

// -- Helper builders --

fn build_pyth_ref_input() -> Input {
  Input {
    output_reference: OutputReference {
      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
      output_index: 0,
    },
    output: Output {
      address: address.from_script(script_hash),
      value: assets.from_asset(pyth_policy_id, "Pyth State", 1),
      datum: InlineDatum(
        Pyth {
          governance: Governance {
            wormhole: #"00000000000000000000000000000000000000000000000000000000",
            emitter_chain: 0,
            emitter_address: #"",
            seen_sequence: 0,
          },
          trusted_signers: [],
          deprecated_withdraw_scripts: [],
          withdraw_script: withdraw_script_hash,
        },
      ),
      reference_script: None,
    },
  }
}

fn build_unlock_tx(pyth_update: ByteArray, user_lovelace: Int) -> Transaction {
  let updates: Data = [pyth_update]
  Transaction {
    ..placeholder,
    reference_inputs: [build_pyth_ref_input()],
    redeemers: [
      Pair(Withdraw(address.Script(withdraw_script_hash)), updates),
    ],
    extra_signatories: [sponsor_key_hash],
    outputs: [
      Output {
        address: address.from_verification_key(user_key_hash),
        value: assets.from_lovelace(user_lovelace),
        datum: NoDatum,
        reference_script: None,
      },
    ],
  }
}

// -- Cancel tests --

test cancel_succeeds() {
  let tx =
    Transaction { ..placeholder, extra_signatories: [sponsor_key_hash] }
  pay_with_pyth.pay_with_pyth.spend(
    1000,
    address.from_verification_key(user_key_hash),
    address.from_verification_key(sponsor_key_hash),
    pyth_policy_id,
    None,
    Cancel,
    #"",
    tx,
  )
}

test cancel_fails_without_sponsor_sig() fail {
  let tx = Transaction { ..placeholder, extra_signatories: [] }
  pay_with_pyth.pay_with_pyth.spend(
    1000,
    address.from_verification_key(user_key_hash),
    address.from_verification_key(sponsor_key_hash),
    pyth_policy_id,
    None,
    Cancel,
    #"",
    tx,
  )
}

// -- Unlock tests --

// At $0.75/ADA, $10.00 (1000 cents) => ceil(1000*10000 / 0.75) = 13_333_334 lovelace
test unlock_exact_amount_075() {
  pay_with_pyth.pay_with_pyth.spend(
    1000,
    address.from_verification_key(user_key_hash),
    address.from_verification_key(sponsor_key_hash),
    pyth_policy_id,
    None,
    Unlock,
    #"",
    build_unlock_tx(pyth_update_075, 13_333_334),
  )
}

test unlock_overpay_succeeds_075() {
  pay_with_pyth.pay_with_pyth.spend(
    1000,
    address.from_verification_key(user_key_hash),
    address.from_verification_key(sponsor_key_hash),
    pyth_policy_id,
    None,
    Unlock,
    #"",
    build_unlock_tx(pyth_update_075, 15_000_000),
  )
}

test unlock_underpay_fails_075() fail {
  pay_with_pyth.pay_with_pyth.spend(
    1000,
    address.from_verification_key(user_key_hash),
    address.from_verification_key(sponsor_key_hash),
    pyth_policy_id,
    None,
    Unlock,
    #"",
    build_unlock_tx(pyth_update_075, 13_333_333),
  )
}

// At $0.50/ADA, $10.00 => 1000*10000 / 0.50 = 20_000_000 lovelace
test unlock_exact_amount_050() {
  pay_with_pyth.pay_with_pyth.spend(
    1000,
    address.from_verification_key(user_key_hash),
    address.from_verification_key(sponsor_key_hash),
    pyth_policy_id,
    None,
    Unlock,
    #"",
    build_unlock_tx(pyth_update_050, 20_000_000),
  )
}

test unlock_fails_without_sponsor_sig() fail {
  let updates: Data = [pyth_update_075]
  let tx =
    Transaction {
      ..placeholder,
      reference_inputs: [build_pyth_ref_input()],
      redeemers: [
        Pair(Withdraw(address.Script(withdraw_script_hash)), updates),
      ],
      extra_signatories: [],
      outputs: [
        Output {
          address: address.from_verification_key(user_key_hash),
          value: assets.from_lovelace(13_333_334),
          datum: NoDatum,
          reference_script: None,
        },
      ],
    }
  pay_with_pyth.pay_with_pyth.spend(
    1000,
    address.from_verification_key(user_key_hash),
    address.from_verification_key(sponsor_key_hash),
    pyth_policy_id,
    None,
    Unlock,
    #"",
    tx,
  )
}

test unlock_wrong_address_fails() fail {
  let wrong_key =
    #"aabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd00000099"
  let updates: Data = [pyth_update_075]
  let tx =
    Transaction {
      ..placeholder,
      reference_inputs: [build_pyth_ref_input()],
      redeemers: [
        Pair(Withdraw(address.Script(withdraw_script_hash)), updates),
      ],
      extra_signatories: [sponsor_key_hash],
      outputs: [
        Output {
          address: address.from_verification_key(wrong_key),
          value: assets.from_lovelace(13_333_334),
          datum: NoDatum,
          reference_script: None,
        },
      ],
    }
  pay_with_pyth.pay_with_pyth.spend(
    1000,
    address.from_verification_key(user_key_hash),
    address.from_verification_key(sponsor_key_hash),
    pyth_policy_id,
    None,
    Unlock,
    #"",
    tx,
  )
}
