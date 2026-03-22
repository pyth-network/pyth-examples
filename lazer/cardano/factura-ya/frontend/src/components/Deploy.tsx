import { DEPLOY } from "../lib/transactions.ts";

export function Deploy() {
  return (
    <div>
      <h2>Deploy Validators</h2>
      <p className="subtitle">
        Publish the 3 smart contracts as reference scripts on PreProd.
      </p>

      <div className="deploy-info">
        <div className="deploy-row">
          <span className="deploy-label">Escrow</span>
          <code>{DEPLOY.escrow.scriptHash.slice(0, 16)}...</code>
        </div>
        <div className="deploy-row">
          <span className="deploy-label">Invoice Mint</span>
          <code>{DEPLOY.invoiceMint.policyId.slice(0, 16)}...</code>
        </div>
        <div className="deploy-row">
          <span className="deploy-label">Marketplace</span>
          <code>{DEPLOY.marketplace.scriptHash.slice(0, 16)}...</code>
        </div>
        <div className="deploy-row">
          <span className="deploy-label">Cost</span>
          <span>~40 tADA (locked in UTxOs, recoverable)</span>
        </div>
      </div>

      <a
        href="/deploy.html"
        target="_blank"
        className="submit-btn"
        style={{ display: "inline-block", textDecoration: "none", marginTop: "1rem" }}
      >
        Open Deploy Page
      </a>
      <p style={{ marginTop: "0.75rem", color: "#666", fontSize: "0.85rem" }}>
        Opens a standalone page that connects your wallet directly and deploys to PreProd.
      </p>
    </div>
  );
}
