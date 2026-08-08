import { useState } from "react";
import { connectWallet } from "../lib/cardano";

interface Props {
  address: string | null;
  onConnect: (addr: string) => void;
  onDisconnect?: () => void;
  highlight?: boolean;
}

export default function WalletConnect({ address, onConnect, onDisconnect, highlight }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setLoading(true);
    setError(null);
    try {
      const addr = await connectWallet();
      onConnect(addr);
    } catch (e: any) {
      // Fallback to demo mode
      console.warn("Wallet connection failed, using demo mode:", e.message);
      onConnect("addr_test1qz...demo");
    } finally {
      setLoading(false);
    }
  };

  if (address) {
    const isDemo = address.includes("demo");
    return (
      <div style={{ textAlign: "center", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
        <span style={{ color: isDemo ? "var(--warning)" : "var(--success)" }}>
          {isDemo ? "Demo Mode" : "Connected"}
        </span>
        {!isDemo && (
          <code style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>
            {address.length > 30 ? address.slice(0, 14) + "..." + address.slice(-8) : address}
          </code>
        )}
        {onDisconnect && (
          <button
            onClick={onDisconnect}
            style={{ maxWidth: 80, padding: "0.35rem 0.6rem", fontSize: "0.75rem", background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)" }}
          >
            Exit
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
      <button
        className={`wallet-btn ${highlight ? "hint-glow-btn" : ""}`}
        onClick={connect}
        disabled={loading}
        style={{ maxWidth: 300 }}
      >
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.5rem" }}>{error}</p>}
    </div>
  );
}
