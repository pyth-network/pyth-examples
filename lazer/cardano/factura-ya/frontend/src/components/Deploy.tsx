import { useEffect, useState } from "react";
import { DEPLOY } from "../lib/transactions.ts";

interface DeployStatus {
  deployed: boolean;
  walletConnected: boolean;
  walletAddress: string;
  networkId: number;
  utxoCount: number;
}

export function Deploy() {
  const [status, setStatus] = useState<DeployStatus | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("http://localhost:3002/status");
        if (res.ok) setStatus(await res.json());
      } catch {
        setStatus(null);
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  const serverUp = status !== null;
  const deployed = status?.deployed ?? false;

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
          <span className="deploy-label">Deploy Server</span>
          <span style={{ color: serverUp ? "#4caf50" : "#ef5350" }}>
            {serverUp ? "Running on :3002" : "Not running — start with: cd offchain && npx tsx src/deploy-server.ts"}
          </span>
        </div>
        {deployed && (
          <>
            <div className="deploy-row">
              <span className="deploy-label">Status</span>
              <span style={{ color: "#4caf50" }}>Verified on PreProd</span>
            </div>
            <div className="deploy-row">
              <span className="deploy-label">Wallet</span>
              <code>{status?.walletAddress?.slice(0, 20)}...</code>
            </div>
            <div className="deploy-row">
              <span className="deploy-label">UTxOs</span>
              <span>{status?.utxoCount}</span>
            </div>
          </>
        )}
      </div>

      {deployed ? (
        <p className="deploy-success">
          Validators verified on PreProd! Wallet connected with {status?.utxoCount} UTxOs.
        </p>
      ) : serverUp ? (
          <button
          className="submit-btn"
          style={{ marginTop: "1rem" }}
          onClick={() => window.open("http://localhost:3002", "_blank")}
        >
          Open Deploy Page
        </button>
      ) : (
        <p style={{ color: "#888", marginTop: "1rem", fontSize: "0.85rem" }}>
          Start the deploy server first.
        </p>
      )}
    </div>
  );
}
