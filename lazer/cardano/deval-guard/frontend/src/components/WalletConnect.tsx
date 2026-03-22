interface Props {
  address: string | null;
  onConnect: (addr: string) => void;
}

export default function WalletConnect({ address, onConnect }: Props) {
  const connect = async () => {
    // CIP-30 wallet connection
    const cardano = (window as any).cardano;
    if (!cardano) {
      // Demo mode: generate a fake address
      onConnect("addr_test1qz...demo");
      return;
    }

    // Try common wallets in order
    const wallets = ["nami", "eternl", "flint", "lace"];
    for (const name of wallets) {
      if (cardano[name]) {
        try {
          const api = await cardano[name].enable();
          const addresses = await api.getUsedAddresses();
          if (addresses.length > 0) {
            onConnect(addresses[0].slice(0, 20) + "...");
            return;
          }
        } catch {
          continue;
        }
      }
    }

    // Fallback demo
    onConnect("addr_test1qz...demo");
  };

  if (address) {
    return (
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <span style={{ color: "var(--success)", marginRight: "0.5rem" }}>Connected</span>
        <code style={{ color: "var(--text-dim)", fontSize: "0.85rem" }}>{address}</code>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
      <button className="wallet-btn" onClick={connect} style={{ maxWidth: 300 }}>
        Connect Wallet
      </button>
    </div>
  );
}
