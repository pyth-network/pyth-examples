const chains = [
  {
    name: "Cardano",
    status: "live",
    statusLabel: "Live",
    description:
      "Primary execution surface. Control-plane and custody flow are live in the MVP; real Pyth witness and live swap integration are next.",
    features: ["Policy Vault", "Hot Bucket", "DexHunter Adapter"],
  },
  {
    name: "Solana (SVM)",
    status: "scaffold",
    statusLabel: "Scaffolded",
    description: "Adapter structure ready. Supports native custody or Squads-based multisig execution patterns.",
    features: ["Pyth Native", "Jupiter DEX", "Squads Compatible"],
  },
  {
    name: "Ethereum (EVM)",
    status: "scaffold",
    statusLabel: "Scaffolded",
    description: "Adapter structure ready. Supports native custody or Safe-based multisig execution patterns.",
    features: ["Pyth EVM", "Uniswap v4", "Safe Compatible"],
  },
];

const statusStyles: Record<string, { chip: string; dot: string }> = {
  live: { chip: "chip-green", dot: "bg-green" },
  scaffold: { chip: "chip-blue", dot: "bg-accent" },
};

export function MultichainStatus() {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h3 className="text-sm font-semibold text-text">Multichain Status</h3>
        <p className="text-xs text-text-muted mt-1">
          Chain adapters and integration readiness
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-line-soft">
        {chains.map((chain) => (
          <div
            key={chain.name}
            className="bg-panel p-5 space-y-3 hover:bg-panel-hover transition-colors"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text">{chain.name}</h4>
              <span className={statusStyles[chain.status].chip}>
                <span
                  className={`status-dot ${statusStyles[chain.status].dot}`}
                />
                {chain.statusLabel}
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {chain.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {chain.features.map((f) => (
                <span
                  key={f}
                  className="px-2 py-0.5 rounded-md bg-bg-soft text-[0.65rem] font-mono text-text-muted border border-line-soft"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
