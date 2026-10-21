import { useState, useEffect } from "react";
import {
  getAvailableWallets,
  connectWallet,
  shortenAddress,
  lovelaceToAda,
  type WalletInfo,
  type ConnectedWallet,
} from "../lib/wallet.ts";

interface Props {
  onConnect: (wallet: ConnectedWallet) => void;
  onDisconnect: () => void;
  connected: ConnectedWallet | null;
}

export function WalletConnect({ onConnect, onDisconnect, connected }: Props) {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Small delay to let wallet extensions inject
    const timer = setTimeout(() => {
      setWallets(getAvailableWallets());
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleConnect = async (walletId: string) => {
    setConnecting(true);
    setError(null);
    try {
      const wallet = await connectWallet(walletId);
      if (wallet.networkId !== 0) {
        setError("Please switch to PreProd testnet");
        return;
      }
      onConnect(wallet);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  if (connected) {
    return (
      <div className="wallet-connected">
        <div className="wallet-info">
          <img src={connected.info.icon} alt="" className="wallet-icon" />
          <span className="wallet-address">
            {shortenAddress(connected.addressBech32)}
          </span>
          <span className="wallet-balance">
            {lovelaceToAda(connected.balanceLovelace)} ADA
          </span>
        </div>
        <button className="disconnect-btn" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      {wallets.length === 0 ? (
        <p className="no-wallet">
          No CIP-30 wallet detected. Install Nami, Eternl, or Lace.
        </p>
      ) : (
        <div className="wallet-list">
          {wallets.map((w) => (
            <button
              key={w.id}
              className="wallet-btn"
              onClick={() => handleConnect(w.id)}
              disabled={connecting}
            >
              <img src={w.icon} alt="" className="wallet-icon" />
              {connecting ? "Connecting..." : w.name}
            </button>
          ))}
        </div>
      )}
      {error && <p className="wallet-error">{error}</p>}
    </div>
  );
}
