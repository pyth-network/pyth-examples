use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/address.{Address}
use cardano/assets.{PolicyId, Value, quantity_of}
use cardano/transaction.{Datum, Output, OutputReference, Transaction}
use cardano/transaction as tx
use pyth
use types/u32

/// Parametric insurance params (strike in same raw units as Pyth feed price).
pub type HedgeParams {
  strike_raw: Int,
  payout_lovelace: Int,
}

/// Vault state: one locked RWA NFT, nominal debt, Pyth feed for that asset.
pub type VaultDatum {
  /// Payment key hash that controls Adjust / Close / ClaimInsurance.
  owner: VerificationKeyHash,
  /// Pyth Lazer governance policy on Cardano (PreProd constant off-chain).
  pyth_policy: PolicyId,
  /// Locked shadow NFT.
  nft_policy: PolicyId,
  nft_name: ByteArray,
  /// Synthetic debt in lovelace (demo accounting).
  debt_lovelace: Int,
  /// Units of collateral (configure off-chain so price_raw * qty is comparable to debt).
  collateral_qty: Int,
  /// Pyth Lazer feed id (e.g. 346 XAU/USD).
  feed_id: Int,
  hedge: Option<HedgeParams>,
}

pub type VaultRedeemer {
  Adjust { new_debt: Int }
  ApplyHedge { strike_raw: Int, payout_lovelace: Int }
  Close
  Liquidate
  ClaimInsurance
}

fn owner_signed(self: Transaction, who: VerificationKeyHash) -> Bool {
  list.any(self.extra_signatories, fn(k) { k == who })
}

fn same_address(a: Address, b: Address) -> Bool {
  a.payment_credential == b.payment_credential && a.stake_credential == b.stake_credential
}

fn quantity_nft(value: Value, policy: PolicyId, name: ByteArray) -> Int {
  quantity_of(value, policy, name)
}

fn parse_vault_datum(d: Data) -> VaultDatum {
  expect d: VaultDatum = d
  d
}

fn continuing_at(
  outputs: List<Output>,
  vault_addr: Address,
) -> Option<Output> {
  list.find(outputs, fn(o) { same_address(o.address, vault_addr) })
}

fn pyth_price_for_feed(
  pyth_policy: PolicyId,
  feed_id: Int,
  self: Transaction,
) -> Int {
  let updates = pyth.get_updates(pyth_policy, self)
  expect [update] = updates
  expect Some(feed) =
    list.find(update.feeds, fn(f) { u32.as_int(f.feed_id) == feed_id })
  expect Some(Some(price)) = feed.price
  price
}

validator vault {
  spend(
    datum: Option<VaultDatum>,
    redeemer: VaultRedeemer,
    own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(v) = datum
    let own_in = tx.resolve_input(self.inputs, own_ref)
    let vault_addr = own_in.address
    let nft_in = quantity_nft(own_in.value, v.nft_policy, v.nft_name)

    when redeemer is {
      Adjust { new_debt } -> {
        expect owner_signed(self, v.owner)?
        expect new_debt >= 0
        expect nft_in > 0
        expect Some(cont) = continuing_at(self.outputs, vault_addr)
        expect Datum.InlineDatum(raw) = cont.datum
        let next = parse_vault_datum(raw)
        and {
          (next.owner == v.owner)?,
          (next.pyth_policy == v.pyth_policy)?,
          (next.nft_policy == v.nft_policy)?,
          (next.nft_name == v.nft_name)?,
          (next.collateral_qty == v.collateral_qty)?,
          (next.feed_id == v.feed_id)?,
          (next.hedge == v.hedge)?,
          (next.debt_lovelace == new_debt)?,
          (quantity_nft(cont.value, v.nft_policy, v.nft_name) == nft_in)?,
        }
      }

      ApplyHedge { strike_raw, payout_lovelace } -> {
        expect owner_signed(self, v.owner)?
        expect nft_in > 0
        expect strike_raw > 0
        expect payout_lovelace >= 0
        expect Some(cont) = continuing_at(self.outputs, vault_addr)
        expect Datum.InlineDatum(raw) = cont.datum
        let next = parse_vault_datum(raw)
        let expected_hedge =
          Some(HedgeParams { strike_raw, payout_lovelace })
        and {
          (next.owner == v.owner)?,
          (next.pyth_policy == v.pyth_policy)?,
          (next.nft_policy == v.nft_policy)?,
          (next.nft_name == v.nft_name)?,
          (next.debt_lovelace == v.debt_lovelace)?,
          (next.collateral_qty == v.collateral_qty)?,
          (next.feed_id == v.feed_id)?,
          (next.hedge == expected_hedge)?,
          (quantity_nft(cont.value, v.nft_policy, v.nft_name) == nft_in)?,
        }
      }

      Close -> {
        expect owner_signed(self, v.owner)?
        expect v.debt_lovelace == 0
        expect nft_in > 0
        expect None = continuing_at(self.outputs, vault_addr)
        True
      }

      Liquidate -> {
        let price = pyth_price_for_feed(v.pyth_policy, v.feed_id, self)
        // Underwater when collateral value strictly below 110% * debt (integer compare).
        let lhs = price * v.collateral_qty * 100
        let rhs = v.debt_lovelace * 110
        and {
          (lhs < rhs)?,
          (v.debt_lovelace > 0)?,
        }
      }

      ClaimInsurance -> {
        expect owner_signed(self, v.owner)?
        expect Some(h) = v.hedge
        let price = pyth_price_for_feed(v.pyth_policy, v.feed_id, self)
        price < h.strike_raw
      }
    }
  }
}
