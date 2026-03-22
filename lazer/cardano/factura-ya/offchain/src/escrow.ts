/**
 * Off-chain transaction builders for the escrow / collateral validator.
 *
 * Three operations:
 * - Lock: create escrow UTxO with collateral (typically in same tx as mint)
 * - Release: buyer confirms payment, collateral returned to seller
 * - Forfeit: buyer reports non-payment, collateral transferred to buyer
 */

// --- Types ---

export interface EscrowDatumFields {
  invoice_id: string;
  seller: string;
  collateral_lovelace: number;
  buyer: string | null;
  due_date_posix_ms: number;
  status: "Locked" | "Released" | "Forfeited";
}

export interface LockEscrowParams {
  datum: EscrowDatumFields;
  /** Lovelace to lock as collateral. */
  collateralLovelace: number;
  /** The escrow validator script address. */
  escrowAddress: string;
}

export interface ReleaseEscrowParams {
  /** The UTxO reference of the escrow to consume. */
  escrowUtxoRef: string;
  /** The seller's address to send collateral to. */
  sellerAddress: string;
  /** Lovelace amount to return. */
  collateralLovelace: number;
  redeemer: "Release";
}

export interface ForfeitEscrowParams {
  /** The UTxO reference of the escrow to consume. */
  escrowUtxoRef: string;
  /** The buyer's address to send collateral to. */
  buyerAddress: string;
  /** Lovelace amount to transfer. */
  collateralLovelace: number;
  redeemer: "Forfeit";
}

// --- Constants ---

/** Grace period after due date before forfeit is allowed (7 days in ms). */
export const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

/** Minimum collateral percentage in basis points. 1000 = 10%. */
export const MIN_COLLATERAL_BPS = 1000;

// --- Builders ---

/**
 * Calculate the minimum collateral required for an invoice.
 *
 * @param invoiceAmountLovelace - The invoice value converted to lovelace.
 * @param collateralBps - Collateral percentage in basis points (default: 1000 = 10%).
 */
export function calculateCollateral(
  invoiceAmountLovelace: number,
  collateralBps: number = MIN_COLLATERAL_BPS,
): number {
  return Math.ceil((invoiceAmountLovelace * collateralBps) / 10_000);
}

/**
 * Build parameters for creating an escrow UTxO (lock collateral).
 *
 * Typically called alongside buildMintInvoiceParams so the escrow
 * is created in the same transaction as the NFT mint.
 */
export function buildLockEscrowParams(
  invoiceId: string,
  sellerPkh: string,
  collateralLovelace: number,
  dueDatePosixMs: number,
  escrowAddress: string,
): LockEscrowParams {
  return {
    datum: {
      invoice_id: invoiceId,
      seller: sellerPkh,
      collateral_lovelace: collateralLovelace,
      buyer: null,
      due_date_posix_ms: dueDatePosixMs,
      status: "Locked",
    },
    collateralLovelace,
    escrowAddress,
  };
}

/**
 * Build parameters for releasing collateral back to the seller.
 *
 * The caller must:
 * 1. Include the buyer's signature.
 * 2. Set validity range lower bound >= due_date_posix_ms.
 * 3. Include an output paying collateral to the seller.
 */
export function buildReleaseEscrowParams(
  escrowUtxoRef: string,
  sellerAddress: string,
  collateralLovelace: number,
): ReleaseEscrowParams {
  return {
    escrowUtxoRef,
    sellerAddress,
    collateralLovelace,
    redeemer: "Release",
  };
}

/**
 * Build parameters for forfeiting collateral to the buyer.
 *
 * The caller must:
 * 1. Include the buyer's signature.
 * 2. Set validity range lower bound >= due_date_posix_ms + GRACE_PERIOD_MS.
 * 3. Include an output paying collateral to the buyer.
 */
export function buildForfeitEscrowParams(
  escrowUtxoRef: string,
  buyerAddress: string,
  collateralLovelace: number,
): ForfeitEscrowParams {
  return {
    escrowUtxoRef,
    buyerAddress,
    collateralLovelace,
    redeemer: "Forfeit",
  };
}
