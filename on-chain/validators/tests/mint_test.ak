//use aiken/collection/dict
//use aiken/interval
//use cardano/address.{Address, Script}
//use cardano/assets
//use cardano/transaction.{
//  Input, InlineDatum, Output, OutputReference, Transaction, Withdraw,
//}
//use pyth.{Governance, Pyth}
//use synth_dolar.{Mint, PoolDatum}
//
//// ── Constants ─────────────────────────────────────────────────────────────────
//
///// Policy ID of the synth token (28 zero bytes).
//const policy_id: ByteArray =
//  #"00000000000000000000000000000000000000000000000000000000"
//
///// Policy ID for the Pyth State NFT reference input.
//const pyth_policy_id: ByteArray =
//  #"11111111111111111111111111111111111111111111111111111111"
//
///// Script hash of the Pyth withdraw script (authorises price updates).
//const withdraw_script_hash: ByteArray =
//  #"22222222222222222222222222222222222222222222222222222222"
//
///// Payment key hash of the position owner.
//const owner_pkh: ByteArray =
//  #"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
//
//const ada_usd_feed_id = 16
//
//const collateral_ratio = 150
//
//const liquidation_threshold = 120
//
//// ── Crafted Pyth price message ─────────────────────────────────────────────
////
//// parse_without_verification skips Ed25519 checks, so the signature and
//// public-key bytes can be arbitrary zeros.
////
//// Wire layout  (133 bytes total):
////   [4]  outer magic    b9011a82
////   [64] signature      (zeros)
////   [32] public key     (zeros)
////   [2]  payload length 1f00  (= 31 bytes, little-endian u16)
////   [31] payload:
////          [4]  inner magic    75d3c793
////          [8]  timestamp_us   (zeros)
////          [1]  channel_id     00
////          [1]  feeds_len      01
////          [4]  feed_id        10000000  (= 16, LE u32)
////          [1]  prop_count     02
////          [1]  prop id 0      00  (Price)
////          [8]  price          801d2c0400000000  (= 70_000_000, i64 LE)
////          [1]  prop id 4      04  (Exponent)
////          [2]  exponent       f8ff  (= -8, i16 LE)
////
//// Decoded:  feed.price    = Some(Some(70_000_000))
////           feed.exponent = Some(-8)
////   → real ADA/USD price = 70_000_000 × 10^-8 = $0.70
//
//const pyth_price_message: ByteArray =
//  #"b901 1a820000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001f0075d3c79300000000000000000001100000000200801d2c040000000004f8ff"
//
//// ── Helpers ───────────────────────────────────────────────────────────────────
//
//fn script_address(hash: ByteArray) -> Address {
//  Address { payment_credential: Script(hash), stake_credential: None }
//}
//
///// Reference input carrying the Pyth State NFT and a Pyth datum.
///// get_updates uses this to discover the withdraw_script hash.
//fn make_pyth_state_input() -> Input {
//  let state: Data =
//    Pyth {
//      governance: Governance {
//        wormhole: #"",
//        emitter_chain: 0,
//        emitter_address: #"",
//        seen_sequence: 0,
//      },
//      trusted_signers: [],
//      deprecated_withdraw_scripts: [],
//      withdraw_script: withdraw_script_hash,
//    }
//
//  Input {
//    output_reference: OutputReference {
//      transaction_id: #"0000000000000000000000000000000000000000000000000000000000000000",
//      output_index: 0,
//    },
//    output: Output {
//      address: script_address(
//        #"33333333333333333333333333333333333333333333333333333333",
//      ),
//      value: assets.merge(
//        assets.from_lovelace(2_000_000),
//        assets.from_asset(pyth_policy_id, "Pyth State", 1),
//      ),
//      datum: InlineDatum(state),
//      reference_script: None,
//    },
//  }
//}
//
///// Pool UTxO input locked at the script address.
//fn make_pool_input(lovelace: Int) -> Input {
//  let datum: Data = PoolDatum { owner: owner_pkh }
//
//  Input {
//    output_reference: OutputReference {
//      transaction_id: #"1111111111111111111111111111111111111111111111111111111111111111",
//      output_index: 0,
//    },
//    output: Output {
//      address: script_address(policy_id),
//      value: assets.from_lovelace(lovelace),
//      datum: InlineDatum(datum),
//      reference_script: None,
//    },
//  }
//}
//
///// Pool UTxO output returned to the script address after ADA deposit.
//fn make_pool_output(lovelace: Int) -> Output {
//  let datum: Data = PoolDatum { owner: owner_pkh }
//
//  Output {
//    address: script_address(policy_id),
//    value: assets.from_lovelace(lovelace),
//    datum: InlineDatum(datum),
//    reference_script: None,
//  }
//}
//
//// ── Mint test ─────────────────────────────────────────────────────────────────
////
//// Scenario: ADA/USD = $0.70,  deposit 1.5 ADA,  collateral_ratio = 150
////
////   synth_base = 1_500_000 × 70_000_000 / 10^8 = 1_050_000 micro-USD
////   minted     = 1_050_000 × 100 / 150          =   700_000 micro-USD  ($0.70)
////
//// All mint checks must pass:
////   ✓ ada_deposited >= 1
////   ✓ minted_amount == expected_minted_amount
//
//test mint_valid_deposit_yields_correct_synth_amount() {
//  let initial_pool_ada = 2_000_000
//  let ada_deposited = 1_500_000
//  let minted_amount = 700_000
//
//  // The Pyth withdraw-script redeemer is List<ByteArray>; one signed message.
//  let updates: List<ByteArray> = [pyth_price_message]
//  let updates_data: Data = updates
//
//  let tx =
//    Transaction {
//      inputs: [make_pool_input(initial_pool_ada)],
//      reference_inputs: [make_pyth_state_input()],
//      outputs: [make_pool_output(initial_pool_ada + ada_deposited)],
//      fee: 0,
//      mint: assets.from_asset(policy_id, #"", minted_amount),
//      certificates: [],
//      withdrawals: [],
//      validity_range: interval.everything,
//      extra_signatories: [],
//      redeemers: [
//        Pair(Withdraw(Script(withdraw_script_hash)), updates_data),
//      ],
//      datums: dict.empty,
//      id: #"0000000000000000000000000000000000000000000000000000000000000000",
//      votes: [],
//      proposal_procedures: [],
//      current_treasury_amount: None,
//      treasury_donation: None,
//    }
//
//  synth_dolar.synth_dolar(
//    pyth_policy_id,
//    ada_usd_feed_id,
//    collateral_ratio,
//    liquidation_threshold,
//  ).mint(Mint, policy_id, tx)
//}
//