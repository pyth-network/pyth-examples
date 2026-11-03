use aiken/collection/list
use cardano/address.{Script}
use cardano/assets
use cardano/assets.{PolicyId}
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}
use types.{
  Deposit, PoolDatum, PoolRedeemer, ReserveDecrease, ReserveIncrease, Withdraw,
}

/// NFT token name that identifies the unique pool UTxO.
const pool_nft_name: ByteArray = "DevalGuard Pool"

/// LP token name minted to liquidity providers.
const lp_token_name: ByteArray = "DG-LP"

// --- Validator ---

validator liquidity_pool {
  spend(
    datum: Option<PoolDatum>,
    redeemer: PoolRedeemer,
    _utxo: OutputReference,
    self: Transaction,
  ) {
    expect Some(datum) = datum
    // Find our own script hash from the continuing output
    let own_policy = find_own_policy(self)

    // Find the continuing pool output (must carry the pool NFT)
    let continuing_output = find_pool_output(self.outputs, own_policy)
    expect InlineDatum(out_datum) = continuing_output.datum
    expect out_datum: PoolDatum = out_datum

    when redeemer is {
      Deposit -> {
        // The ADA value in the continuing output must increase
        let in_lovelace = pool_lovelace(self, own_policy)
        let out_lovelace = assets.lovelace_of(continuing_output.value)
        let deposit_amount = out_lovelace - in_lovelace
        expect deposit_amount > 0

        // Datum must reflect the deposit
        expect
          out_datum.total_deposits == datum.total_deposits + deposit_amount
        expect out_datum.total_reserved == datum.total_reserved
        expect out_datum.total_premiums_earned == datum.total_premiums_earned

        // Must mint LP tokens proportional to deposit
        let lp_minted = assets.quantity_of(self.mint, own_policy, lp_token_name)
        expect lp_minted == deposit_amount

        True
      }

      Withdraw -> {
        let in_lovelace = pool_lovelace(self, own_policy)
        let out_lovelace = assets.lovelace_of(continuing_output.value)
        let withdraw_amount = in_lovelace - out_lovelace
        expect withdraw_amount > 0

        // Cannot withdraw into reserved funds
        let available = datum.total_deposits - datum.total_reserved
        expect withdraw_amount <= available

        // Datum must reflect the withdrawal
        expect
          out_datum.total_deposits == datum.total_deposits - withdraw_amount
        expect out_datum.total_reserved == datum.total_reserved
        expect out_datum.total_premiums_earned == datum.total_premiums_earned

        // Must burn LP tokens proportional to withdrawal
        let lp_burned =
          assets.quantity_of(self.mint, own_policy, lp_token_name)
        expect lp_burned == -withdraw_amount

        True
      }

      ReserveIncrease { amount } -> {
        expect amount > 0
        // Sufficient unreserved liquidity must exist
        expect datum.total_deposits - datum.total_reserved >= amount

        // Datum update: only total_reserved changes
        expect out_datum.total_deposits == datum.total_deposits
        expect out_datum.total_reserved == datum.total_reserved + amount
        expect out_datum.total_premiums_earned == datum.total_premiums_earned

        // Pool value must not decrease (no funds leave)
        let in_lovelace = pool_lovelace(self, own_policy)
        let out_lovelace = assets.lovelace_of(continuing_output.value)
        expect out_lovelace >= in_lovelace

        True
      }

      ReserveDecrease { amount } -> {
        expect amount > 0
        expect datum.total_reserved >= amount

        // Datum update: only total_reserved changes
        expect out_datum.total_deposits == datum.total_deposits
        expect out_datum.total_reserved == datum.total_reserved - amount
        expect out_datum.total_premiums_earned == datum.total_premiums_earned

        True
      }
    }
  }

  mint(_redeemer: Data, own_policy: PolicyId, self: Transaction) {
    // LP token minting/burning is validated by the spend handler.
    // We just need to ensure the pool UTxO is being spent in this tx
    // (which means the spend validator ran and approved the operation).
    //
    // For pool NFT minting (initialization), we use a simple check.
    let nft_qty = assets.quantity_of(self.mint, own_policy, pool_nft_name)
    let lp_qty = assets.quantity_of(self.mint, own_policy, lp_token_name)

    if nft_qty == 1 {
      // Pool initialization: mint exactly 1 NFT, no LP tokens
      expect lp_qty == 0
      True
    } else if nft_qty == 0 {
      // LP token mint or burn: the pool UTxO must be spent (spend handler validates)
      expect lp_qty != 0
      expect pool_utxo_is_spent(self, own_policy)
      True
    } else {
      False
    }
  }

  else(_) {
    fail
  }
}

// --- Helpers ---

/// Find the pool UTxO's lovelace from inputs (the one carrying the pool NFT).
fn pool_lovelace(tx: Transaction, policy: PolicyId) -> Int {
  expect Some(input) =
    list.find(
      tx.inputs,
      fn(inp) {
        assets.quantity_of(inp.output.value, policy, pool_nft_name) == 1
      },
    )
  assets.lovelace_of(input.output.value)
}

/// Find the continuing output that carries the pool NFT.
fn find_pool_output(outputs: List<Output>, policy: PolicyId) -> Output {
  expect Some(output) =
    list.find(
      outputs,
      fn(out) {
        assets.quantity_of(out.value, policy, pool_nft_name) == 1
      },
    )
  output
}

/// Get our own policy from the transaction by looking for pool NFT in inputs.
fn find_own_policy(tx: Transaction) -> PolicyId {
  expect Some(input) =
    list.find(
      tx.inputs,
      fn(inp) {
        // Check if any policy in this input's value has our pool NFT
        when inp.output.address.payment_credential is {
          Script(hash) ->
            assets.quantity_of(inp.output.value, hash, pool_nft_name) == 1
          _ -> False
        }
      },
    )
  expect Script(hash) = input.output.address.payment_credential
  hash
}

/// Check if the pool UTxO is being spent in this transaction.
fn pool_utxo_is_spent(tx: Transaction, policy: PolicyId) -> Bool {
  list.any(
    tx.inputs,
    fn(inp) {
      assets.quantity_of(inp.output.value, policy, pool_nft_name) == 1
    },
  )
}
