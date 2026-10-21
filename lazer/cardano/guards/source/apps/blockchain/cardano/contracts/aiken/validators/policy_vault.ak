use cardano/script_context.{ScriptContext}
use cardano/transaction.{OutputReference, Transaction}
use guards_one/policy_vault as policy
use guards_one/types.{
  AuthorizeExecution, CompleteExecution, EmergencyWithdraw, PolicyDatum,
  PolicyRedeemer, Resume, UpdatePolicy,
}

// Spend validator for the bounded PolicyVault state machine.
// Authorize/complete remain fail-closed until the validator enforces
// continuing outputs, chain-derived time, and real on-chain Pyth verification.
validator policy_vault {
  spend(
    datum: Option<PolicyDatum>,
    redeemer: PolicyRedeemer,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(datum) = datum

    when redeemer is {
      AuthorizeExecution { .. } ->
        False

      CompleteExecution { .. } ->
        False

      // These paths still stay closed until the validator compares consumed and
      // recreated outputs. Emergency withdraw is intentionally recoverable by
      // governance signers.
      UpdatePolicy { .. } -> False
      Resume { .. } -> False
      EmergencyWithdraw { actor } ->
        policy.emergency_withdraw(datum, actor, self)
    }
  }

  else(_ctx: ScriptContext) {
    False
  }
}
