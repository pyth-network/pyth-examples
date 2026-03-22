use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{VerificationKey}
use cardano/assets.{PolicyId, lovelace_of, quantity_of}
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}
use pyth
use types/u32

// ── Types ─────────────────────────────────────────────────

pub type DuelStatus {
  Waiting
  Active
  Finished
}

pub type Player {
  pkh: VerificationKeyHash,
  feed_id: Int,
  // Pyth Pro feed ID (ej: 16 = ADA/USD)
  start_price: Option<Int>,
}

// Price snapshot at the beginning of the duel (set in Join)

pub type DuelDatum {
  duel_id: ByteArray,
  player_a: Player,
  player_b: Option<Player>,
  bet_amount_lovelace: Int,
  status: DuelStatus,
  deadline: Option<Int>,
}

// POSIX ms; duel resolves after this

pub type DuelRedeemer {
  // Player B joins; el backend includes the Pyth withdrawal in the same TX
  Join { player_pkh: VerificationKeyHash, feed_id: Int }

  // The backend resolves post-deadline; prices come from Pyth withdrawal
  Resolve { timestamp: Int }

  // Cancel if player B did not join
  Cancel
}

// ── Helpers ─────────────────────────────────────

fn signed_by(tx: Transaction, pkh: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, pkh)
}

// Returns percentual change x1_000_000 (1% = 10_000)
fn percent_change(start: Int, end: Int) -> Int {
  ( end - start ) * 1_000_000 / start
}

fn abs(n: Int) -> Int {
  if n >= 0 {
    n
  } else {
    -n
  }
}

fn pays_to(o: Output, pkh: VerificationKeyHash) -> Bool {
  o.address.payment_credential == VerificationKey(pkh)
}

// ── Pyth helpers ──────────────────────────────────────────

// Reads the price from a specific feed from Pyth-verified updates.
// pyth.get_updates guarantees the signatures are valid, we only
// look for the feed_id we care about.
//
// Return Price as Int
fn get_price_from_pyth(
  pyth_id: PolicyId,
  tx: Transaction,
  feed_id: Int,
) -> Option<Int> {
  let updates = pyth.get_updates(pyth_id, tx)

  list.find_map(
    updates,
    fn(update) {
      list.find_map(
        update.feeds,
        fn(feed) {
          if u32.as_int(feed.feed_id) == feed_id {
            when feed.price is {
              Some(Some(p)) -> Some(p)
              _ -> None
            }
          } else {
            None
          }
        },
      )
    },
  )
}

// ── Continuing Output ──────────────────────────────────────
// Verifies that an output UTxO exists with the right duel_id and authenticity NFT
// Used in Join to guarantee conitnuity
fn find_continuing_output(
  tx: Transaction,
  duel_id: ByteArray,
  policy_id: PolicyId,
) -> Option<(DuelDatum, Int)> {
  list.find_map(
    tx.outputs,
    fn(o) {
      when o.datum is {
        InlineDatum(raw) -> {
          expect d: DuelDatum = raw
          if d.duel_id == duel_id {
            let has_nft = quantity_of(o.value, policy_id, duel_id) == 1
            if has_nft {
              Some((d, lovelace_of(o.value)))
            } else {
              None
            }
          } else {
            None
          }
        }
        _ -> None
      }
    },
  )
}

// ── Main Validator ─────────────────────────────────────────

validator bet(
  backend_pkh: VerificationKeyHash,
  nft_policy_id: PolicyId,
  pyth_id: PolicyId,
) {
  // Policy ID del deployment de Pyth en esta red
  spend(
    datum: Option<DuelDatum>,
    redeemer: DuelRedeemer,
    utxo: OutputReference,
    self: Transaction,
  ) {
    when datum is {
      None -> False
      Some(d) -> {
        // No se deben mintear NFTs de esta policy en TXs intermedias
        let has_auth_nft =
          list.any(
            self.inputs,
            fn(i) {
              i.output_reference == utxo && quantity_of(
                i.output.value,
                nft_policy_id,
                d.duel_id,
              ) == 1
            },
          )

        // Allow burning (-1) but block any positive minting in intermediate TXs
        let no_extra_mint =
          quantity_of(self.mint, nft_policy_id, d.duel_id) <= 0

        let base_ok = has_auth_nft && no_extra_mint

        base_ok && when redeemer is {
          // ── JOIN ────────────────────────────────────
          // Player B joins the duel.
          // Tx must include:
          //   - A zero-withdrawal from the Pyth script with the signed updates
          //   - Pyth state UTxO as reference input
          //   - A continuing output with status=Active and both start_prices
          //
          // CHECKS: prices of output Datum 
          // match with the things Pyth reports in this Tx
          Join { player_pkh, feed_id } -> {
            let is_waiting = d.status == Waiting
            let not_player_a = player_pkh != d.player_a.pkh
            let no_opponent_yet = d.player_b == None
            let backend_ok = signed_by(self, backend_pkh)
            let diff_asset = feed_id != d.player_a.feed_id

            // Read start prices from Pyth (verify crypt.)
            let price_a_opt =
              get_price_from_pyth(pyth_id, self, d.player_a.feed_id)
            let price_b_opt = get_price_from_pyth(pyth_id, self, feed_id)

            let output_ok =
              when (price_a_opt, price_b_opt) is {
                (Some(pa), Some(pb)) ->
                  when
                    find_continuing_output(self, d.duel_id, nft_policy_id)
                  is {
                    None -> False
                    Some((out_datum, out_lovelace)) -> {
                      // The pool has to be 2 times the individual bet
                      let amount_ok = out_lovelace == d.bet_amount_lovelace * 2

                      // Datum has to have updated status
                      // With prices read from pyth
                      let datum_ok =
                        out_datum.status == Active && out_datum.player_a.start_price == Some(
                          pa,
                        ) && when (out_datum.deadline, out_datum.player_b) is {
                          (Some(dl), Some(pb_out)) ->
                            dl > 0 && pb_out.pkh == player_pkh && pb_out.feed_id == feed_id && pb_out.start_price == Some(
                              pb,
                            )
                          _ -> False
                        }

                      amount_ok && datum_ok
                    }
                  }
                _ -> False
              }

            is_waiting && not_player_a && no_opponent_yet && backend_ok && diff_asset && output_ok
          }

          // ── RESOLVE ──────────────────────────────────
          // Backends call this post deadline
          // Final prices are read from Pyth withdrawal in this Tx
          //
          // Winner: asset with greater change % since their start_price.
          // Draw: difference < 1% → both get their deposit back.
          Resolve { timestamp } -> {
            let is_active = d.status == Active
            let backend_ok = signed_by(self, backend_pkh)

            let deadline_passed =
              when d.deadline is {
                None -> False
                Some(dl) -> timestamp >= dl
              }

            let payout_ok =
              when d.player_b is {
                None -> False
                Some(pb) -> {
                  // Read final prices from Pyth
                  let end_a_opt =
                    get_price_from_pyth(pyth_id, self, d.player_a.feed_id)
                  let end_b_opt = get_price_from_pyth(pyth_id, self, pb.feed_id)

                  when
                    (
                      d.player_a.start_price,
                      pb.start_price,
                      end_a_opt,
                      end_b_opt,
                    )
                  is {
                    (Some(sa), Some(sb), Some(end_a), Some(end_b)) -> {
                      let change_a = percent_change(sa, end_a)
                      let change_b = percent_change(sb, end_b)
                      let total = d.bet_amount_lovelace * 2
                      let is_draw = abs(change_a - change_b) < 100

                      if is_draw {
                        // Draw: each player recovers their initial bet
                        let a_ok =
                          list.any(
                            self.outputs,
                            fn(o) {
                              pays_to(o, d.player_a.pkh) && lovelace_of(o.value) >= d.bet_amount_lovelace
                            },
                          )
                        let b_ok =
                          list.any(
                            self.outputs,
                            fn(o) {
                              pays_to(o, pb.pkh) && lovelace_of(o.value) >= d.bet_amount_lovelace
                            },
                          )
                        a_ok && b_ok
                      } else {
                        // Winner: takes it all
                        let winner =
                          if change_a > change_b {
                            d.player_a.pkh
                          } else {
                            pb.pkh
                          }
                        list.any(
                          self.outputs,
                          fn(o) {
                            pays_to(o, winner) && lovelace_of(o.value) >= total
                          },
                        )
                      }
                    }
                    // Error in price retrieval 
                    _ -> False
                  }
                }
              }

            is_active && backend_ok && deadline_passed && payout_ok
          }

          // ── CANCEL ────────────────────────────────────
          // Only valid if Status is Waiting
          // Player A or backend may cancel
          // NFT must be burned and Player A recovers their money
          Cancel -> {
            let is_waiting = d.status == Waiting
            let no_opponent = d.player_b == None
            let authorized =
              signed_by(self, d.player_a.pkh) || signed_by(self, backend_pkh)
            let refund_ok =
              list.any(
                self.outputs,
                fn(o) {
                  pays_to(o, d.player_a.pkh) && lovelace_of(o.value) >= d.bet_amount_lovelace
                },
              )
            let nft_burned =
              quantity_of(self.mint, nft_policy_id, d.duel_id) == -1

            is_waiting && no_opponent && authorized && refund_ok && nft_burned
          }
        }
      }
    }
  }

  else(_) {
    False
  }
}
//                             _ooOoo_
//                            o8888888o
//                            88" . "88
//                            (| -_- |)
//                             O\ = /O
//                         ____/`---'\____
//                       .'  \\|     |//  `.
//                      /  \\|||  :  |||//  \
//                     /  _||||| -:- |||||_  \
//                     |   | \\\  -  ///  |   |
//                     | \_|  ''\---/''  |   |
//                     \  .-\__  `-`  ___/-. /
//                   ___`. .'  /--.--\  `. . __
//                ."" '<  `.___\_<|>_/___.'  >'"".
//               | | :  `- \`.;`\ _ /`;.`/ - ` : | |
//               \  \ `-.   \_ __\ /__ _/   .-` /  /
//          ======`-.____`-.___\_____/___.-`____.-'======
//                             `=---='
//          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                   佛祖保佑             永无BUG
// 佛曰:
//                  写字楼里写字间，   写字间里程序员；
//                  程序人员写程序，   又拿程序换酒钱。
//                  酒醒只在网上坐，   酒醉还来网下眠；
//                  酒醉酒醒日复日，   网上网下年复年。
//                  但愿老死电脑间，   不愿鞠躬老板前；
//                  奔驰宝马贵者趣，   公交自行程序员。
//                  别人笑我忒疯癫，   我笑自己命太贱；
//                  不见满街漂亮妹，   哪个归得程序员？
