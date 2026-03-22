use guards_one/types.{PolicyDatum, PolicyRedeemer}

// Scaffold validator entrypoint.
// Aiken tooling is not installed in this workspace, so this file documents the
// intended structure instead of providing a compiled on-chain script.

validator {
  fn policy(datum: PolicyDatum, redeemer: PolicyRedeemer, ctx: _) -> Bool {
    when redeemer is {
      AuthorizeExecution ->
        // Fail closed until the real oracle witness and keeper checks are
        // wired in. This keeps the scaffold type-safe and non-spendable.
        False

      CompleteExecution ->
        // Fail closed until the real intent/result structures are wired into
        // the validator entrypoint.
        False

      // These branches intentionally fail closed until real authorization
      // logic exists, to avoid accidental unrestricted spending.
      UpdatePolicy -> False
      Resume -> False
      EmergencyWithdraw -> False
    }
  }
}
