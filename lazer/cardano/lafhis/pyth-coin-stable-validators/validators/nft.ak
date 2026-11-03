use aiken/primitive/bytearray
use aiken/collection/dict
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash, sha2_256}
use cardano/assets
use cardano/assets.{PolicyId}
use cardano/transaction.{OutputReference, Transaction}

// ── Redeemer ──────────────────────────────────────────────

pub type NftRedeemer {
  // Mints exactly 1 NFT with asset_name  duel_id
  // derived from UTxO of Player A Wallet that is consumed in this Tx.
  Mint { utxo_ref: OutputReference }

  // Burn one or more NFTs of this policy
  // Used in Resolve and Cancel.
  Burn
}

// ── Helpers ───────────────────────────────────────────────

fn signed_by(tx: Transaction, pkh: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, pkh)
}

// Derives the duel_id from the OutputReference of a wallet UTxO.
// IMPORTANT: uses a fixed size of 8 bytes for the output_index,
// so the encoding is deterministic and matches the off-chain calculation.
fn duel_id_from_input(utxo_ref: OutputReference) -> ByteArray {
  let OutputReference { transaction_id, output_index } = utxo_ref
  sha2_256(
    bytearray.concat(
      transaction_id,
      bytearray.from_int_big_endian(output_index, 8),
    ),
  )
}

// ── Validator ─────────────────────────────────────────────
// Parameter:
//   backend_pkh — only the backend can authorize minting,
//                 preventing anyone from creating spam duels.
//
// This policy ID is passed as `nft_policy_id` to the `bet` validator.
// Compile this validator first, get its hash, and use it
// as a parameter when compiling `bet`.

validator nft_policy(backend_pkh: VerificationKeyHash) {
  mint(
    redeemer: NftRedeemer,
    policy_id: PolicyId,
    self: Transaction,
  ) {
    when redeemer is {

      // ── MINT ────────────────────────────────────────────
      // Conditions:
      //   1. The referenced UTxO in the redeemer must be consumed
      //      (guarantees unicity of duel_id)
      //   2. Exactly 1 Token is minted under this policy,
      //      with asset_name = duel_id derived from that UTxO.
      //   3. Backend signs the TX (avoid spam in duels).
      Mint { utxo_ref } -> {
        // 1. UTxO from wallet of Player A debe must be an input of this TX
        let utxo_consumed =
          list.any(self.inputs, fn(i) {
            i.output_reference == utxo_ref
          })

        // 2. Derive expected id from that input
        let expected_duel_id = duel_id_from_input(utxo_ref)

        // 3. Verify that exactly 1 token with that name is minted
        //    and nothing else under this policy
        let mint_ok =
          when assets.tokens(self.mint, policy_id) |> dict.to_pairs is {
            [Pair(asset_name, quantity)] ->
              asset_name == expected_duel_id && quantity == 1
            _ -> False
          }

        // 4. Backend must sign
        let backend_ok = signed_by(self, backend_pkh)

        utxo_consumed && mint_ok && backend_ok
      }

      // ── BURN ────────────────────────────────────────────
      // Called in Resolve (winner determined) and Cancel
      // (duel aborted before Player B joins).
      //
      // Only verifies that all burned tokens have quantity -1.
      // Business logic (refund, payout) is validated by
      // the spend validator in `bet`.
      Burn -> {
        assets.tokens(self.mint, policy_id)
          |> dict.values()
          |> list.all(fn(q) { q == -1 })
      }
    }
  }

  else(_) { False }
}