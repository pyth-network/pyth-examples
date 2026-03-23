use aiken/crypto.{VerificationKeyHash}

// Bounded Aiken scaffold for guards.one.
// This file intentionally models the data shapes first so the future validator port
// can stay aligned with the current TypeScript simulator.

pub type RiskStage {
  Normal
  Watch
  PartialDerisk
  FullExit
  Frozen
}

pub type ExecutionKind {
  DeriskSwap
  ReentrySwap
}

pub type PolicyDatum {
  vault_id: ByteArray,
  pyth_policy_id: ByteArray,
  stage: RiskStage,
  last_transition_us: Int,
  governance_signers: List<VerificationKeyHash>,
  keepers: List<VerificationKeyHash>,
  approved_route_ids: List<ByteArray>,
  stable_asset_id: ByteArray,
  primary_asset_id: ByteArray,
  current_intent_id: Option<ByteArray>,
  hot_bucket_max_notional: Int,
  max_stale_us: Int,
  max_confidence_bps: Int,
  cooldown_us: Int,
}

pub type PolicyRedeemer {
  AuthorizeExecution {
    witness: PythWitness,
    keeper: VerificationKeyHash,
    now_us: Int,
    intent: ExecutionIntent,
  }

  CompleteExecution { intent: ExecutionIntent, result: ExecutionResult }

  UpdatePolicy { actor: VerificationKeyHash, now_us: Int }

  Resume { actor: VerificationKeyHash, now_us: Int }

  EmergencyWithdraw { actor: VerificationKeyHash }
}

pub type PythWitness {
  pyth_policy_id: ByteArray,
  pyth_state_reference: ByteArray,
  signed_update_hex: ByteArray,
}

pub type ExecutionIntent {
  intent_id: ByteArray,
  vault_id: ByteArray,
  chain_id: ByteArray,
  kind: ExecutionKind,
  stage: RiskStage,
  source_asset_id: ByteArray,
  destination_asset_id: ByteArray,
  route_id: ByteArray,
  max_sell_amount: Int,
  min_buy_amount: Int,
  expiry_us: Int,
  created_at_us: Int,
  reason_hash: ByteArray,
  snapshot_ids: List<ByteArray>,
}

pub type ExecutionResult {
  intent_id: ByteArray,
  vault_id: ByteArray,
  chain_id: ByteArray,
  source_asset_id: ByteArray,
  destination_asset_id: ByteArray,
  sold_amount: Int,
  bought_amount: Int,
  average_price: Int,
  route_id: ByteArray,
  executed_at_us: Int,
  tx_hash: ByteArray,
}

pub type PolicyCheckFailure {
  KeeperNotAuthorized
  PythPolicyMismatch
  IntentAlreadyInFlight
  RouteNotApproved
  AssetNotApproved
  CooldownActive
  FreezeRequired
}
