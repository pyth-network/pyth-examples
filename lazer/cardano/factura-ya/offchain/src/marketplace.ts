/**
 * Off-chain transaction builders for the marketplace validator.
 *
 * Three operations:
 * - List: SME sends invoice NFT to marketplace, creates listing UTxO
 * - Purchase: investor buys listed invoice, payment to seller, NFT to buyer
 * - Delist: seller withdraws listing, NFT returned
 */

// --- Types ---

export interface ListingDatumFields {
  invoice_id: string;
  seller: string;
  asking_price_lovelace: number;
  original_amount_usd: number;
  pyth_price_at_listing: number;
  pyth_exponent_at_listing: number;
  due_date_posix_ms: number;
  status: "Listed" | "Sold" | "Delisted";
}

export interface ListInvoiceParams {
  /** Datum for the listing UTxO. */
  datum: ListingDatumFields;
  /** The invoice NFT asset name. */
  assetName: string;
  /** The invoice minting policy ID. */
  invoicePolicyId: string;
  /** The marketplace validator address. */
  marketplaceAddress: string;
}

export interface PurchaseInvoiceParams {
  /** The listing UTxO reference to consume. */
  listingUtxoRef: string;
  /** Lovelace to pay to the seller. */
  paymentLovelace: number;
  /** Seller's address (for payment output). */
  sellerAddress: string;
  /** Buyer's PKH (for NFT output and escrow update). */
  buyerPkh: string;
  /** The invoice NFT asset name. */
  assetName: string;
  /** The invoice minting policy ID. */
  invoicePolicyId: string;
  /** The escrow UTxO to consume and recreate with buyer set. */
  escrowUtxoRef: string;
  /** Updated escrow datum with buyer field set. */
  updatedEscrowDatum: {
    invoice_id: string;
    seller: string;
    collateral_lovelace: number;
    buyer: string;
    due_date_posix_ms: number;
    status: "Locked";
  };
  redeemer: "Purchase";
}

export interface DelistInvoiceParams {
  /** The listing UTxO reference to consume. */
  listingUtxoRef: string;
  /** The seller's address (to return NFT). */
  sellerAddress: string;
  /** The invoice NFT asset name. */
  assetName: string;
  /** The invoice minting policy ID. */
  invoicePolicyId: string;
  redeemer: "Delist";
}

// --- Builders ---

/**
 * Build parameters for listing an invoice on the marketplace.
 *
 * The caller must also attach the Pyth price update in the same tx
 * so the listing price can be validated.
 */
export function buildListInvoiceParams(
  invoiceId: string,
  assetName: string,
  invoicePolicyId: string,
  sellerPkh: string,
  askingPriceLovelace: number,
  originalAmountUsd: number,
  pythPrice: number,
  pythExponent: number,
  dueDatePosixMs: number,
  marketplaceAddress: string,
): ListInvoiceParams {
  return {
    datum: {
      invoice_id: invoiceId,
      seller: sellerPkh,
      asking_price_lovelace: askingPriceLovelace,
      original_amount_usd: originalAmountUsd,
      pyth_price_at_listing: pythPrice,
      pyth_exponent_at_listing: pythExponent,
      due_date_posix_ms: dueDatePosixMs,
      status: "Listed",
    },
    assetName,
    invoicePolicyId,
    marketplaceAddress,
  };
}

/**
 * Build parameters for purchasing a listed invoice.
 *
 * The caller must:
 * 1. Include the buyer's signature.
 * 2. Create an output paying >= asking_price_lovelace to the seller.
 * 3. Create an output sending the NFT to the buyer.
 * 4. Consume the escrow UTxO and recreate it with buyer set.
 */
export function buildPurchaseInvoiceParams(
  listingUtxoRef: string,
  sellerAddress: string,
  buyerPkh: string,
  paymentLovelace: number,
  assetName: string,
  invoicePolicyId: string,
  escrowUtxoRef: string,
  escrowInvoiceId: string,
  escrowSeller: string,
  escrowCollateralLovelace: number,
  escrowDueDatePosixMs: number,
): PurchaseInvoiceParams {
  return {
    listingUtxoRef,
    paymentLovelace,
    sellerAddress,
    buyerPkh,
    assetName,
    invoicePolicyId,
    escrowUtxoRef,
    updatedEscrowDatum: {
      invoice_id: escrowInvoiceId,
      seller: escrowSeller,
      collateral_lovelace: escrowCollateralLovelace,
      buyer: buyerPkh,
      due_date_posix_ms: escrowDueDatePosixMs,
      status: "Locked",
    },
    redeemer: "Purchase",
  };
}

/**
 * Build parameters for delisting an invoice (seller withdraws).
 *
 * The caller must include the seller's signature.
 */
export function buildDelistInvoiceParams(
  listingUtxoRef: string,
  sellerAddress: string,
  assetName: string,
  invoicePolicyId: string,
): DelistInvoiceParams {
  return {
    listingUtxoRef,
    sellerAddress,
    assetName,
    invoicePolicyId,
    redeemer: "Delist",
  };
}
