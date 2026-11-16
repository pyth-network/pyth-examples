import { useEffect, useState } from "react";
import { DEPLOY } from "../lib/transactions.ts";

interface InvoiceNft {
  assetName: string;
  assetNameAscii: string;
  address: string;
  amount: number;
  debtor: string;
  source: "on-chain" | "pending";
  txHash?: string;
}

const TX_SERVER = "http://localhost:3002";

export function Marketplace() {
  const [invoices, setInvoices] = useState<InvoiceNft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10_000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAll() {
    const results: InvoiceNft[] = [];

    // 1. Check on-chain NFTs via Koios
    try {
      const res = await fetch("/koios/api/v1/policy_asset_addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _asset_policy: DEPLOY.invoiceMint.policyId }),
      });
      if (res.ok) {
        const data = await res.json();
        for (const a of data as any[]) {
          results.push({
            assetName: a.asset_name || "",
            assetNameAscii: hexToAscii(a.asset_name || ""),
            address: a.payment_address || "",
            amount: 0,
            debtor: "",
            source: "on-chain",
          });
        }
      }
    } catch { /* ignore */ }

    // 2. Check registered invoices from deploy server
    try {
      const res = await fetch(`${TX_SERVER}/status`);
      if (res.ok) {
        const state = await res.json();
        const invoices = state.invoices || [];
        // Also include legacy lastInvoice if present
        if (state.lastInvoice) invoices.push(state.lastInvoice);
        for (const inv of invoices) {
          const alreadyOnChain = results.some(
            (r) => r.assetName === inv.invoiceId,
          );
          if (!alreadyOnChain) {
            results.push({
              assetName: inv.invoiceId || "",
              assetNameAscii: hexToAscii(inv.invoiceId || ""),
              address: state.walletAddress || "",
              amount: inv.amount || 0,
              debtor: inv.debtor || "",
              source: "pending",
              txHash: inv.txHash,
            });
          }
        }
      }
    } catch { /* server not running */ }

    setInvoices(results);
    setLoading(false);
  }

  if (loading) return <p>Querying PreProd for invoice NFTs...</p>;

  return (
    <div>
      <h2>Invoice Marketplace</h2>
      <div className="deploy-info" style={{ marginBottom: "1rem" }}>
        <div className="deploy-row">
          <span className="deploy-label">Invoice Policy</span>
          <code>{DEPLOY.invoiceMint.policyId.slice(0, 20)}...</code>
        </div>
        <div className="deploy-row">
          <span className="deploy-label">Total invoices</span>
          <span>{invoices.length}</span>
        </div>
      </div>

      {error && <p className="wallet-error">{error}</p>}

      {invoices.length === 0 ? (
        <div className="empty">
          <p>No invoices registered yet.</p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            Register an invoice to see it here.
          </p>
        </div>
      ) : (
        <div className="invoice-grid">
          {invoices.map((inv) => (
            <div key={inv.assetName} className="invoice-card">
              <div className="card-header">
                <span className="invoice-id">
                  {inv.assetNameAscii || inv.assetName.slice(0, 16) + "..."}
                </span>
                <span
                  className={`status ${inv.source === "on-chain" ? "listed" : "sold"}`}
                >
                  {inv.source === "on-chain" ? "On-chain" : "Registered"}
                </span>
              </div>
              <div className="card-body">
                {inv.amount > 0 && (
                  <div className="field">
                    <label>Amount (USD)</label>
                    <span>${inv.amount.toLocaleString()}</span>
                  </div>
                )}
                {inv.debtor && (
                  <div className="field">
                    <label>Debtor</label>
                    <span>{inv.debtor}</span>
                  </div>
                )}
                <div className="field">
                  <label>Holder</label>
                  <span style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                    {inv.address ? inv.address.slice(0, 20) + "..." : "—"}
                  </span>
                </div>
                {inv.txHash && (
                  <div className="field">
                    <label>Tx</label>
                    <span style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                      {inv.txHash.slice(0, 16)}...
                    </span>
                  </div>
                )}
              </div>
              <button className="buy-btn">Purchase</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function hexToAscii(hex: string): string {
  try {
    let str = "";
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substring(i, i + 2), 16);
      if (code >= 32 && code <= 126) str += String.fromCharCode(code);
    }
    return str;
  } catch {
    return "";
  }
}
