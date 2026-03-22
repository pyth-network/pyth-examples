import { useEffect, useState } from "react";
import { fetchInvoices, type IndexedInvoice } from "../lib/api.ts";

function lovelaceToAda(lovelace: number): string {
  return (lovelace / 1_000_000).toFixed(2);
}

function daysUntil(posixMs: number): number {
  return Math.ceil((posixMs - Date.now()) / (1000 * 60 * 60 * 24));
}

export function Marketplace() {
  const [invoices, setInvoices] = useState<IndexedInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices()
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetchInvoices().then(setInvoices).catch(() => {});
    }, 10_000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <p>Loading marketplace...</p>;

  if (invoices.length === 0) {
    return (
      <div className="empty">
        <h2>Marketplace</h2>
        <p>No invoices listed yet. Be the first to tokenize!</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Invoice Marketplace</h2>
      <p>{invoices.length} invoice(s) available</p>
      <div className="invoice-grid">
        {invoices.map((inv) => (
          <InvoiceCard key={inv.invoiceId} invoice={inv} />
        ))}
      </div>
    </div>
  );
}

function InvoiceCard({ invoice }: { invoice: IndexedInvoice }) {
  const days = daysUntil(invoice.dueDatePosixMs);
  const discount =
    invoice.originalAmountArs > 0
      ? (
          ((invoice.originalAmountArs - invoice.askingPriceLovelace) /
            invoice.originalAmountArs) *
          100
        ).toFixed(1)
      : "0";

  return (
    <div className="invoice-card">
      <div className="card-header">
        <span className="invoice-id">
          {invoice.invoiceId.slice(0, 8)}...
        </span>
        <span className={`status ${invoice.status.toLowerCase()}`}>
          {invoice.status}
        </span>
      </div>
      <div className="card-body">
        <div className="field">
          <label>Original (ARS)</label>
          <span>{invoice.originalAmountArs.toLocaleString()}</span>
        </div>
        <div className="field">
          <label>Price (ADA)</label>
          <span>{lovelaceToAda(invoice.askingPriceLovelace)}</span>
        </div>
        <div className="field">
          <label>Discount</label>
          <span>{discount}%</span>
        </div>
        <div className="field">
          <label>Due</label>
          <span>{days > 0 ? `${days} days` : "Overdue"}</span>
        </div>
      </div>
      <button className="buy-btn">Purchase</button>
    </div>
  );
}
