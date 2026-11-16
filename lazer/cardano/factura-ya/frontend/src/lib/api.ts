/** Client for the Factura Ya indexer API. */

const API_BASE = "/api";

export interface IndexedInvoice {
  invoiceId: string;
  seller: string;
  askingPriceLovelace: number;
  originalAmountArs: number;
  pythPriceAtListing: number;
  pythExponentAtListing: number;
  dueDatePosixMs: number;
  status: "Listed" | "Sold" | "Delisted";
  buyer: string | null;
  txHash: string;
  updatedAt: number;
}

export async function fetchInvoices(): Promise<IndexedInvoice[]> {
  const res = await fetch(`${API_BASE}/invoices`);
  const data = await res.json();
  return data.invoices;
}

export async function fetchInvoice(id: string): Promise<IndexedInvoice> {
  const res = await fetch(`${API_BASE}/invoices/${id}`);
  if (!res.ok) throw new Error("Invoice not found");
  return res.json();
}
