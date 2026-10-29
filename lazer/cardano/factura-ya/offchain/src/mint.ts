/**
 * Off-chain transaction builders for minting and burning invoice NFTs.
 *
 * These are framework-agnostic helpers that produce the transaction
 * parameters. The actual tx construction depends on the wallet SDK
 * (lucid, mesh, or cardano-serialization-lib).
 */

import { createHash } from "node:crypto";

// --- Types ---

export interface InvoiceInput {
  /** Unique identifier for the invoice. */
  invoiceId: string;
  /** Invoice amount in USD (integer, e.g. cents or smallest unit). */
  amountUsd: number;
  /** Due date as POSIX milliseconds. */
  dueDatePosixMs: number;
  /** Debtor company/person name. */
  debtorName: string;
  /** Debtor contact info (email or phone) — will be hashed before on-chain storage. */
  debtorContact: string;
}

export interface InvoiceDatumFields {
  invoice_id: string;
  seller: string;
  amount_usd: number;
  due_date_posix_ms: number;
  debtor_name: string;
  debtor_contact_hash: string;
  created_at_posix_ms: number;
}

export interface MintInvoiceParams {
  /** The invoice NFT asset name (= invoice_id as hex). */
  assetName: string;
  /** The InvoiceDatum to attach to the output. */
  datum: InvoiceDatumFields;
  /** The redeemer for the minting policy. */
  redeemer: "MintInvoice";
}

export interface BurnInvoiceParams {
  /** The invoice NFT asset name to burn. */
  assetName: string;
  /** The redeemer for the minting policy. */
  redeemer: "BurnInvoice";
}

// --- Helpers ---

/**
 * Hash debtor contact info with SHA-256 for on-chain privacy.
 * Returns hex-encoded hash.
 */
export function hashDebtorContact(contact: string): string {
  return createHash("sha256").update(contact).digest("hex");
}

/**
 * Convert a UTF-8 string to a hex-encoded ByteArray for use as asset name.
 */
export function toHex(str: string): string {
  return Buffer.from(str, "utf-8").toString("hex");
}

// --- Builders ---

/**
 * Build parameters for minting a new invoice NFT.
 *
 * The caller must:
 * 1. Include the seller's signature in the transaction.
 * 2. Set the validity range with a lower bound (for due date validation).
 * 3. Create an output at the desired address holding the NFT + InvoiceDatum.
 * 4. Optionally create the escrow UTxO in the same or a follow-up transaction.
 */
export function buildMintInvoiceParams(
  invoice: InvoiceInput,
  sellerPkh: string,
): MintInvoiceParams {
  const assetName = toHex(invoice.invoiceId);
  const contactHash = hashDebtorContact(invoice.debtorContact);

  return {
    assetName,
    datum: {
      invoice_id: assetName,
      seller: sellerPkh,
      amount_usd: invoice.amountUsd,
      due_date_posix_ms: invoice.dueDatePosixMs,
      debtor_name: toHex(invoice.debtorName),
      debtor_contact_hash: contactHash,
      created_at_posix_ms: Date.now(),
    },
    redeemer: "MintInvoice",
  };
}

/**
 * Build parameters for burning an invoice NFT after settlement.
 *
 * The caller must:
 * 1. Include the NFT holder's signature.
 * 2. Include the escrow UTxO as a reference input (so the minting policy
 *    can verify the escrow status is Released or Forfeited).
 */
export function buildBurnInvoiceParams(
  invoiceId: string,
): BurnInvoiceParams {
  return {
    assetName: toHex(invoiceId),
    redeemer: "BurnInvoice",
  };
}
