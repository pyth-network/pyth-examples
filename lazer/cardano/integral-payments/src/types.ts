/**
 * src/types.ts
 *
 * Shared TypeScript types for the IntegralPayments off-chain backend.
 * These types mirror the on-chain Aiken types defined in contracts/lib/pyth/types.ak
 * and contracts/validators/payment_gateway.ak so that both layers speak the
 * same data vocabulary.
 */

// ---------------------------------------------------------------------------
// Pyth oracle types
// ---------------------------------------------------------------------------

/**
 * A signed Pyth Lazer price observation, as returned by the Hermes API
 * and prepared for on-chain submission as a Cardano redeemer.
 *
 * Field names and semantics match the on-chain `PriceProof` Aiken type.
 */
export interface PriceProof {
  /** 32-byte hex feed identifier (without 0x prefix) */
  feedId: string;
  /** Raw price mantissa — real price = price × 10^exponent */
  price: bigint;
  /** Confidence interval mantissa — same exponent as price */
  conf: bigint;
  /** Negative power-of-ten exponent (e.g. -8 means ×10⁻⁸) */
  exponent: number;
  /** Unix timestamp (seconds) of the Pythnet observation */
  publishTime: number;
  /** 64-byte Ed25519 signature (hex, no 0x prefix) */
  signature: string;
  /** 32-byte Ed25519 public key of the Pyth signer (hex, no 0x prefix) */
  signerKey: string;
}

/**
 * The human-readable price computed from a raw PriceProof.
 * Used for display and logging; not sent on-chain.
 */
export interface ResolvedPrice {
  proof: PriceProof;
  /** Price as a floating-point number for display only */
  priceFloat: number;
  /** Confidence interval as a floating-point number */
  confFloat: number;
  /** Age of the price observation in seconds at the time of resolution */
  ageSeconds: number;
}

/** Supported Cardano-native price feeds */
export type SupportedFeed = "ADA/USD" | "BTC/USD" | "ETH/USD" | "USDC/USD";

// ---------------------------------------------------------------------------
// Payment gateway types
// ---------------------------------------------------------------------------

/** Network identifier — must match the Lucid provider network */
export type CardanoNetwork = "Mainnet" | "Preprod" | "Preview";

/**
 * The datum attached to a payment-request UTxO locked at the validator.
 * Mirrors the on-chain `PaymentDatum` Aiken type exactly.
 */
export interface PaymentDatum {
  /** Unique identifier derived from the ERP invoice reference (hex bytes) */
  paymentId: string;
  /** Bech32 merchant address — receives the lovelace at settlement */
  merchantAddress: string;
  /** Invoice amount in US-cent integer units (e.g. $10.50 → 1050) */
  invoiceUsdCents: number;
  /** 32-byte Pyth feed id for the asset accepted for this invoice (hex) */
  acceptedFeedId: string;
  /** Verification key hash of the customer authorised to settle (hex) */
  customerPkh: string;
  /** Unix timestamp (seconds) when this request was created */
  createdAt: number;
}

/**
 * The redeemer supplied by the customer to spend the locked UTxO.
 * Mirrors the on-chain `PaymentRedeemer` Aiken type exactly.
 */
export interface PaymentRedeemer {
  proof: PriceProof;
  /** Lower bound of the tx validity interval as Unix seconds */
  nowSeconds: number;
}

/**
 * A payment request in its full lifecycle representation.
 * Combines the on-chain datum with off-chain tracking metadata.
 */
export interface PaymentRequest {
  datum: PaymentDatum;
  /** Cardano UTxO reference (txHash#index) of the locked UTxO */
  utxoRef?: string;
  /** Current lifecycle status */
  status: PaymentStatus;
  /** ISO-8601 timestamp of the last status change */
  updatedAt: string;
}

export type PaymentStatus =
  | "pending"       // Created by the ERP module, not yet locked on-chain
  | "locked"        // UTxO locked at the validator address
  | "settling"      // Collect transaction submitted, awaiting confirmation
  | "settled"       // On-chain confirmed — invoice is paid
  | "expired"       // Payment window elapsed without settlement
  | "failed";       // On-chain transaction rejected

// ---------------------------------------------------------------------------
// Transaction result types
// ---------------------------------------------------------------------------

export interface TxResult {
  txHash: string;
  /** Estimated slot at which the transaction will be confirmed */
  estimatedConfirmationSlot?: number;
}

export interface LockResult extends TxResult {
  /** UTxO reference of the newly locked payment request UTxO */
  utxoRef: string;
}

export interface CollectResult extends TxResult {
  /** Lovelace amount actually paid to the merchant */
  paidLovelace: bigint;
  /** Pyth price used for the conversion */
  priceUsed: ResolvedPrice;
}

// ---------------------------------------------------------------------------
// Configuration types
// ---------------------------------------------------------------------------

export interface GatewayConfig {
  network: CardanoNetwork;
  blockfrostApiKey: string;
  blockfrostUrl: string;
  hermesUrl: string;
  /** Hex-encoded compiled validator CBOR (from plutus.json after `aiken build`) */
  validatorCbor: string;
  /** 32-byte Ed25519 trusted signer key embedded in the validator (hex) */
  trustedSignerKey: string;
  /** Slippage tolerance in basis points (e.g. 50 = 0.50 %) */
  toleranceBps: number;
  /** Maximum price age in seconds before the gateway refuses to settle */
  maxPriceAgeSeconds: number;
  /** Minimum ADA deposit locked with each payment request UTxO (lovelace) */
  minDepositLovelace: bigint;
}
