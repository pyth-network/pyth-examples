use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{Transaction}
use guards_one/types.{
  ExecutionIntent, ExecutionResult, PolicyDatum, PythWitness,
}

// Scaffold policy module.
// The actual Aiken port should mirror the runtime checks currently implemented in
// `packages/cardano/src/policy-vault.ts` and the custody model in
// `docs/cardano-custody-model.md`.

pub fn is_governance_authorized(
  datum: PolicyDatum,
  self: Transaction,
  actor: VerificationKeyHash,
) -> Bool {
  list.has(datum.governance_signers, actor) && list.has(
    self.extra_signatories,
    actor,
  )
}

pub fn is_keeper_authorized(
  datum: PolicyDatum,
  self: Transaction,
  keeper: VerificationKeyHash,
) -> Bool {
  list.has(datum.keepers, keeper) && list.has(self.extra_signatories, keeper)
}

pub fn has_intent_in_flight(datum: PolicyDatum) -> Bool {
  when datum.current_intent_id is {
    Some(_) -> True
    None -> False
  }
}

pub fn is_route_approved(datum: PolicyDatum, route_id: ByteArray) -> Bool {
  list.has(datum.approved_route_ids, route_id)
}

pub fn has_live_witness(witness: PythWitness) -> Bool {
  witness.pyth_policy_id != #"" && witness.pyth_state_reference != #"" && witness.signed_update_hex != #""
}

pub fn is_asset_approved(datum: PolicyDatum, asset_id: ByteArray) -> Bool {
  asset_id == datum.primary_asset_id || asset_id == datum.stable_asset_id
}

pub fn is_intent_shape_valid(intent: ExecutionIntent) -> Bool {
  intent.max_sell_amount > 0 && intent.min_buy_amount > 0 && intent.created_at_us <= intent.expiry_us && intent.source_asset_id != intent.destination_asset_id && intent.intent_id != #"" && intent.vault_id != #"" && intent.route_id != #"" && intent.reason_hash != #""
}

pub fn is_intent_asset_pair_approved(
  datum: PolicyDatum,
  intent: ExecutionIntent,
) -> Bool {
  is_asset_approved(datum, intent.source_asset_id) && is_asset_approved(
    datum,
    intent.destination_asset_id,
  )
}

pub fn is_hot_bucket_intent_bounded(
  datum: PolicyDatum,
  intent: ExecutionIntent,
) -> Bool {
  intent.max_sell_amount <= datum.hot_bucket_max_notional
}

pub fn is_result_matching_intent(
  intent: ExecutionIntent,
  result: ExecutionResult,
) -> Bool {
  result.intent_id == intent.intent_id && result.chain_id == intent.chain_id && result.source_asset_id == intent.source_asset_id && result.destination_asset_id == intent.destination_asset_id && result.route_id == intent.route_id
}

pub fn is_result_in_window(
  intent: ExecutionIntent,
  result: ExecutionResult,
) -> Bool {
  result.executed_at_us >= intent.created_at_us && result.executed_at_us <= intent.expiry_us
}

pub fn is_result_within_bounds(
  intent: ExecutionIntent,
  result: ExecutionResult,
) -> Bool {
  result.sold_amount >= 0 && result.bought_amount >= 0 && result.sold_amount <= intent.max_sell_amount && result.bought_amount >= intent.min_buy_amount && result.average_price > 0 && result.tx_hash != #""
}

pub fn is_hot_bucket_result_bounded(
  datum: PolicyDatum,
  result: ExecutionResult,
) -> Bool {
  result.sold_amount <= datum.hot_bucket_max_notional
}

pub fn authorize_execution(
  datum: PolicyDatum,
  witness: PythWitness,
  keeper: VerificationKeyHash,
  now_us: Int,
  intent: ExecutionIntent,
  self: Transaction,
) -> Bool {
  // This stays bounded: it verifies keeper signatures, witness presence, cooldown,
  // route/asset allowlists, and hot-bucket limits. It still does not parse the
  // Pyth payload on-chain or verify output continuity against a produced next datum.
  is_keeper_authorized(datum, self, keeper) && has_intent_in_flight(datum) == False && has_live_witness(
    witness,
  ) && witness.pyth_policy_id == datum.pyth_policy_id && now_us >= datum.last_transition_us && now_us - datum.last_transition_us >= datum.cooldown_us && intent.created_at_us == now_us && intent.vault_id == datum.vault_id && is_route_approved(
    datum,
    intent.route_id,
  ) && is_intent_shape_valid(intent) && is_intent_asset_pair_approved(
    datum,
    intent,
  ) && is_hot_bucket_intent_bounded(datum, intent)
}

pub fn complete_execution(
  datum: PolicyDatum,
  intent: ExecutionIntent,
  result: ExecutionResult,
) -> Bool {
  // The scaffold now mirrors the pure completion invariants from the TypeScript
  // simulator even before the tx-context plumbing is available.
  datum.vault_id == intent.vault_id && result.vault_id == datum.vault_id && datum.current_intent_id == Some(
    intent.intent_id,
  ) && is_route_approved(datum, result.route_id) && is_intent_shape_valid(
    intent,
  ) && is_intent_asset_pair_approved(datum, intent) && is_hot_bucket_intent_bounded(
    datum,
    intent,
  ) && is_result_matching_intent(intent, result) && is_result_in_window(
    intent,
    result,
  ) && is_result_within_bounds(intent, result) && is_hot_bucket_result_bounded(
    datum,
    result,
  )
}

pub fn emergency_withdraw(
  datum: PolicyDatum,
  actor: VerificationKeyHash,
  self: Transaction,
) -> Bool {
  // This branch is intentionally explicit: governance can always recover funds
  // with an extra signatory, even while UpdatePolicy/Resume stay closed until
  // output continuity checks are wired into the validator.
  is_governance_authorized(datum, self, actor)
}
