export type InvoiceStatus = "open" | "paid" | "expired";

export interface Invoice {
  id: string;
  sellerAddress: string;
  buyerAddress?: string;
  clientName: string;
  concept: string;
  amountUsd: number;
  pinHash: string;
  invoiceNftPolicyId: string;
  invoiceNftName: string;
  invoiceScriptAddress?: string;
  lockTxHash?: string;
  lockTxIndex?: number;
  adaQuoteSnapshot?: number;
  feedId?: number;
  txHash?: string;
  status: InvoiceStatus;
  deadline: string;
  createdAt: string;
  updatedAt: string;
}