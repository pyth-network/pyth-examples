/**
 * Transaction construction layer.
 *
 * Bridges the frontend forms with the off-chain tx builders.
 * In the MVP this is a placeholder that logs the tx params —
 * full integration requires Evolution SDK + the deployed validator addresses.
 */

// --- Types ---

export interface InvoiceRegistration {
  amountArs: number;
  dueDateDays: number;
  debtorName: string;
  debtorContact: string;
  sellerAddress: string;
}

export interface TxResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// --- Config ---

export const PYTH_PREPROD_POLICY_ID =
  "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";

export const ADA_USD_FEED_ID = 16;

// --- Placeholder tx builders ---

/**
 * Register an invoice: mint NFT + lock collateral + list on marketplace.
 *
 * In a full implementation this would:
 * 1. Connect to Pyth Pro WebSocket for current ADA/USD price
 * 2. Build mint tx with invoice datum
 * 3. Build escrow lock tx with 10% collateral
 * 4. Build marketplace list tx
 * 5. Attach Pyth price update via withdraw-script
 * 6. Sign with CIP-30 wallet
 * 7. Submit to Cardano PreProd
 */
export async function registerInvoice(
  params: InvoiceRegistration,
): Promise<TxResult> {
  console.log("[tx] Registering invoice:", params);

  // Simulate tx construction delay
  await new Promise((r) => setTimeout(r, 1500));

  const invoiceId = generateInvoiceId(params);
  const contactHash = hashContact(params.debtorContact);
  const dueDate = Date.now() + params.dueDateDays * 24 * 60 * 60 * 1000;

  console.log("[tx] Invoice ID:", invoiceId);
  console.log("[tx] Contact hash:", contactHash);
  console.log("[tx] Due date:", new Date(dueDate).toISOString());
  console.log("[tx] Would build: MintInvoice + LockEscrow + ListOnMarketplace");
  console.log("[tx] Pyth policy:", PYTH_PREPROD_POLICY_ID);

  // Return mock tx hash (in production: real submitted tx hash)
  return {
    success: true,
    txHash: `mock_${invoiceId.slice(0, 16)}`,
  };
}

/**
 * Purchase an invoice from the marketplace.
 */
export async function purchaseInvoice(
  invoiceId: string,
  buyerAddress: string,
): Promise<TxResult> {
  console.log("[tx] Purchasing invoice:", invoiceId, "buyer:", buyerAddress);
  await new Promise((r) => setTimeout(r, 1500));

  return {
    success: true,
    txHash: `mock_purchase_${invoiceId.slice(0, 8)}`,
  };
}

/**
 * Confirm settlement (release collateral to seller).
 */
export async function confirmSettlement(
  invoiceId: string,
): Promise<TxResult> {
  console.log("[tx] Confirming settlement for:", invoiceId);
  await new Promise((r) => setTimeout(r, 1500));

  return {
    success: true,
    txHash: `mock_settle_${invoiceId.slice(0, 8)}`,
  };
}

// --- Helpers ---

function generateInvoiceId(params: InvoiceRegistration): string {
  const raw = `${params.sellerAddress}-${params.amountArs}-${Date.now()}`;
  return toHex(raw).slice(0, 32);
}

function hashContact(contact: string): string {
  // Simple hash for MVP (in production: use SHA-256)
  let hash = 0;
  for (let i = 0; i < contact.length; i++) {
    hash = ((hash << 5) - hash + contact.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

function toHex(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
