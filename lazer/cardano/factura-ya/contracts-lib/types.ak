use cardano/assets.{PolicyId}
use aiken/crypto.{VerificationKeyHash}
use types/u32.{U32}
use types/u64.{U64}

// --- Price types (Block 1) ---

/// Validated price extracted from a Pyth feed.
/// `price` and `exponent` together represent the real value:
///   real_price = price * 10^exponent
pub type PriceData {
  feed_id: U32,
  price: Int,
  exponent: Int,
  timestamp_us: U64,
}

// --- Invoice types (Block 2) ---

pub type InvoiceMintRedeemer {
  MintInvoice
  BurnInvoice
}

pub type InvoiceDatum {
  invoice_id: ByteArray,
  seller: VerificationKeyHash,
  amount_usd: Int,
  due_date_posix_ms: Int,
  debtor_name: ByteArray,
  debtor_contact_hash: ByteArray,
  created_at_posix_ms: Int,
}

// --- Escrow types (Block 3) ---

pub type EscrowStatus {
  Locked
  Released
  Forfeited
}

pub type EscrowDatum {
  invoice_id: ByteArray,
  seller: VerificationKeyHash,
  collateral_lovelace: Int,
  buyer: Option<VerificationKeyHash>,
  due_date_posix_ms: Int,
  status: EscrowStatus,
}

pub type EscrowRedeemer {
  Release
  Forfeit
}

// --- Marketplace types (Block 4) ---

pub type ListingStatus {
  Listed
  Sold
  Delisted
}

pub type ListingDatum {
  invoice_id: ByteArray,
  seller: VerificationKeyHash,
  asking_price_lovelace: Int,
  original_amount_usd: Int,
  pyth_price_at_listing: Int,
  pyth_exponent_at_listing: Int,
  due_date_posix_ms: Int,
  status: ListingStatus,
}

pub type MarketplaceRedeemer {
  Purchase
  Delist
}

// --- Config ---

/// Pyth deployment config passed as a validator parameter.
pub type PythConfig {
  pyth_policy_id: PolicyId,
  ada_usd_feed_id: U32,
}
