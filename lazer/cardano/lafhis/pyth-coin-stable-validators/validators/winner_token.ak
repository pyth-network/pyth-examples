use aiken/collection/dict
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/assets
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}

// Token name for all victory tokens — fungible, same name across all duels.
// "horseshoe" encoded as UTF-8 hex
const horseshoe: ByteArray = "686f727365736f6f65"

// ── Redeemer ──────────────────────────────────────────────

pub type WinnerRedeemer {
  // Mints exactly 1 "horseshoe" token to the winner.
  // Called by the backend in the same TX as Resolve.
  MintVictory

  // Burns one or more horseshoe tokens (future work: leaderboard redemption).
  BurnVictory
}

// ── Helpers ───────────────────────────────────────────────

fn signed_by(tx: Transaction, pkh: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, pkh)
}

// ── Validator ─────────────────────────────────────────────
// Parameters:
//   backend_pkh — only the backend can authorize minting,
//                 so tokens can only be issued after a real Resolve TX.
//
// Usage:
//   The backend includes this mint alongside the Resolve spend in one TX.
//   That single atomic TX settles the duel AND awards 1 horseshoe to the winner.
//   Winners accumulate horseshoes across duels — their balance is the leaderboard.

validator winner_token(backend_pkh: VerificationKeyHash) {
  mint(
    redeemer: WinnerRedeemer,
    policy_id: PolicyId,
    self: Transaction,
  ) {
    when redeemer is {

      // ── MINT VICTORY ─────────────────────────────────────
      // Conditions:
      //   1. Backend signs the TX (only issued on a real Resolve)
      //   2. Exactly 1 "horseshoe" token minted under this policy
      MintVictory -> {
        let backend_ok = signed_by(self, backend_pkh)

        let mint_ok =
          when assets.tokens(self.mint, policy_id) |> dict.to_pairs is {
            [Pair(asset_name, quantity)] ->
              asset_name == horseshoe && quantity == 1
            _ -> False
          }

        backend_ok && mint_ok
      }

      // ── BURN VICTORY ─────────────────────────────────────
      // Holders can burn their own tokens (no backend needed).
      BurnVictory -> {
        assets.tokens(self.mint, policy_id)
          |> dict.values()
          |> list.all(fn(q) { q == -1 })
      }
    }
  }

  else(_) { False }
}
