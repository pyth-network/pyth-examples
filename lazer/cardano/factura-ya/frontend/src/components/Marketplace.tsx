import { useEffect, useState } from "react";
import { DEPLOY } from "../lib/transactions.ts";

function lovelaceToAda(lovelace: number): string {
  return (lovelace / 1_000_000).toFixed(2);
}

interface MarketplaceUtxo {
  txHash: string;
  index: number;
  lovelace: string;
  hasNft: boolean;
}

export function Marketplace() {
  const [utxos, setUtxos] = useState<MarketplaceUtxo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketplaceUtxos();
    const interval = setInterval(fetchMarketplaceUtxos, 15_000);
    return () => clearInterval(interval);
  }, []);

  async function fetchMarketplaceUtxos() {
    try {
      const res = await fetch(
        "/koios/api/v1/address_utxos",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _addresses: [DEPLOY.marketplace.address],
            _extended: true,
          }),
        },
      );
      if (!res.ok) {
        setUtxos([]);
        return;
      }
      const data = await res.json();
      setUtxos(
        (data as any[]).map((u) => ({
          txHash: u.tx_hash,
          index: u.tx_index,
          lovelace: u.value,
          hasNft:
            u.asset_list?.some(
              (a: any) => a.policy_id === DEPLOY.invoiceMint.policyId,
            ) ?? false,
        })),
      );
    } catch {
      setError("Could not query PreProd");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p>Querying PreProd marketplace address...</p>;

  const listedUtxos = utxos.filter((u) => u.hasNft);

  return (
    <div>
      <h2>Invoice Marketplace</h2>
      <div className="deploy-info" style={{ marginBottom: "1rem" }}>
        <div className="deploy-row">
          <span className="deploy-label">Marketplace</span>
          <code>{DEPLOY.marketplace.address.slice(0, 30)}...</code>
        </div>
        <div className="deploy-row">
          <span className="deploy-label">UTxOs at address</span>
          <span>{utxos.length}</span>
        </div>
        <div className="deploy-row">
          <span className="deploy-label">Listed invoices</span>
          <span>{listedUtxos.length}</span>
        </div>
      </div>

      {error && <p className="wallet-error">{error}</p>}

      {listedUtxos.length === 0 ? (
        <div className="empty">
          <p>No invoices listed on-chain yet.</p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            Deploy the validators first, then register an invoice to see it here.
          </p>
        </div>
      ) : (
        <div className="invoice-grid">
          {listedUtxos.map((u) => (
            <div key={`${u.txHash}#${u.index}`} className="invoice-card">
              <div className="card-header">
                <span className="invoice-id">{u.txHash.slice(0, 12)}...</span>
                <span className="status listed">On-chain</span>
              </div>
              <div className="card-body">
                <div className="field">
                  <label>Tx Hash</label>
                  <span style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                    {u.txHash.slice(0, 20)}...
                  </span>
                </div>
                <div className="field">
                  <label>Locked (ADA)</label>
                  <span>{lovelaceToAda(Number(u.lovelace))}</span>
                </div>
              </div>
              <button className="buy-btn">Purchase</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
