interface Props {
  connected: boolean;
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletButton({
  connected,
  address,
  onConnect,
  onDisconnect,
}: Props) {
  if (connected && address) {
    const short = address.slice(0, 8) + "..." + address.slice(-6);
    return (
      <button
        onClick={onDisconnect}
        className="bg-pyth-card border border-pyth-border px-4 py-2 rounded-lg text-sm hover:bg-pyth-border transition"
      >
        {short}
      </button>
    );
  }
  return (
    <button
      onClick={onConnect}
      className="bg-pyth-purple px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition"
    >
      Connect Wallet
    </button>
  );
}
