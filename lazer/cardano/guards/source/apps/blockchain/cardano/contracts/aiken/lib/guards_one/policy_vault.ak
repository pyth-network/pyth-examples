use guards_one/types.{ExecutionIntent, ExecutionResult, PolicyDatum, PythWitness, RiskStage}

// Scaffold policy module.
// The actual Aiken port should mirror the runtime checks currently implemented in
// `packages/cardano/src/policy-vault.ts` and the custody model in
// `docs/cardano-custody-model.md`.

pub fn is_keeper_authorized(datum: PolicyDatum, keeper: ByteArray) -> Bool {
  list.has(datum.keepers, keeper)
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

pub fn is_asset_approved(datum: PolicyDatum, asset_id: ByteArray) -> Bool {
  asset_id == datum.primary_asset_id || asset_id == datum.stable_asset_id
}

pub fn is_intent_shape_valid(intent: ExecutionIntent) -> Bool {
  intent.max_sell_amount > 0
    && intent.min_buy_amount > 0
    && intent.created_at_us <= intent.expiry_us
    && intent.source_asset_id != intent.destination_asset_id
}

pub fn is_intent_asset_pair_approved(datum: PolicyDatum, intent: ExecutionIntent) -> Bool {
  is_asset_approved(datum, intent.source_asset_id)
    && is_asset_approved(datum, intent.destination_asset_id)
}

pub fn is_hot_bucket_intent_bounded(datum: PolicyDatum, intent: ExecutionIntent) -> Bool {
  intent.max_sell_amount <= datum.hot_bucket_max_notional
}

pub fn is_result_matching_intent(intent: ExecutionIntent, result: ExecutionResult) -> Bool {
  result.intent_id == intent.intent_id
    && result.chain_id == intent.chain_id
    && result.source_asset_id == intent.source_asset_id
    && result.destination_asset_id == intent.destination_asset_id
    && result.route_id == intent.route_id
}

pub fn is_result_in_window(intent: ExecutionIntent, result: ExecutionResult) -> Bool {
  result.executed_at_us >= intent.created_at_us
    && result.executed_at_us <= intent.expiry_us
}

pub fn is_result_within_bounds(intent: ExecutionIntent, result: ExecutionResult) -> Bool {
  result.sold_amount >= 0
    && result.bought_amount >= 0
    && result.sold_amount <= intent.max_sell_amount
    && result.bought_amount >= intent.min_buy_amount
}

pub fn is_hot_bucket_result_bounded(datum: PolicyDatum, result: ExecutionResult) -> Bool {
  result.sold_amount <= datum.hot_bucket_max_notional
}

pub fn authorize_execution(
  datum: PolicyDatum,
  witness: PythWitness,
  keeper: ByteArray,
  now_us: Int,
) -> Bool {
  // Intentionally skeletal: the real validator will check the oracle witness,
  // cooldown, route allowlist, and hot-bucket limits before producing an intent.
  is_keeper_authorized(datum, keeper)
    && !has_intent_in_flight(datum)
    && witness.pyth_policy_id == datum.pyth_policy_id
    && now_us >= datum.last_transition_us
    && now_us - datum.last_transition_us >= datum.cooldown_us
}

pub fn complete_execution(
  datum: PolicyDatum,
  intent: ExecutionIntent,
  result: ExecutionResult,
) -> Bool {
  // The scaffold now mirrors the pure completion invariants from the TypeScript
  // simulator even before the tx-context plumbing is available.
  datum.vault_id == intent.vault_id
    && result.vault_id == datum.vault_id
    && datum.current_intent_id == Some(intent.intent_id)
    && is_route_approved(datum, result.route_id)
    && is_intent_shape_valid(intent)
    && is_intent_asset_pair_approved(datum, intent)
    && is_hot_bucket_intent_bounded(datum, intent)
    && is_result_matching_intent(intent, result)
    && is_result_in_window(intent, result)
    && is_result_within_bounds(intent, result)
    && is_hot_bucket_result_bounded(datum, result)
}

pub fn next_escalation_stage(current: RiskStage) -> RiskStage {
  when current is {
    // Re-entry is modeled as a separate policy path; this helper only documents
    // the monotonic escalation ladder for the scaffold.
    Normal -> Watch
    Watch -> PartialDerisk
    PartialDerisk -> FullExit
    Frozen -> Frozen
    FullExit -> Frozen
  }
}
