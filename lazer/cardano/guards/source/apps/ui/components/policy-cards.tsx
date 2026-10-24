import { PolicyConfig } from "@/lib/types";

interface PolicyCardsProps {
  policy: PolicyConfig;
}

export function PolicyCards({ policy }: PolicyCardsProps) {
  const cards = [
    {
      label: "Protected Floor",
      value: `$${policy.portfolioFloorFiat.toLocaleString()}`,
      description: "Minimum fiat value the engine protects",
      accent: "accent" as const,
    },
    {
      label: "Emergency Floor",
      value: `$${policy.emergencyPortfolioFloorFiat.toLocaleString()}`,
      description: "Triggers full stable exit if breached",
      accent: "red" as const,
    },
    {
      label: "Watch Threshold",
      value: `${policy.watchDrawdownBps} bps`,
      description: "Drawdown trigger for watch mode",
      accent: "yellow" as const,
    },
    {
      label: "Partial De-Risk",
      value: `${policy.partialDrawdownBps} bps`,
      description: "Drawdown trigger for partial swap",
      accent: "yellow" as const,
    },
    {
      label: "Full Exit",
      value: `${policy.fullExitDrawdownBps} bps`,
      description: "Drawdown trigger for emergency exit",
      accent: "red" as const,
    },
    {
      label: "Re-Entry Signal",
      value: `${Math.abs(policy.reentryDrawdownBps)} bps`,
      description: "Recovery needed for auto re-entry",
      accent: "green" as const,
    },
    {
      label: "Oracle Haircut",
      value: `${(policy.haircutBps / 100).toFixed(1)}%`,
      description: "Safety margin on oracle price",
      accent: "default" as const,
    },
    {
      label: "Max Staleness",
      value: `${policy.maxStaleUs / 1_000_000}s`,
      description: "Oracle feed expiry threshold",
      accent: "default" as const,
    },
  ];

  const accentBorder: Record<string, string> = {
    accent: "border-accent/15",
    green: "border-green/15",
    yellow: "border-yellow/15",
    red: "border-red/15",
    default: "border-line",
  };

  const accentText: Record<string, string> = {
    accent: "text-accent",
    green: "text-green",
    yellow: "text-yellow",
    red: "text-red",
    default: "text-text",
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h3 className="text-sm font-semibold text-text">Policy Configuration</h3>
        <p className="text-xs text-text-muted mt-1">
          Risk parameters governing treasury execution
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-line-soft">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`bg-panel border p-4 space-y-1.5 hover:bg-panel-hover transition-colors ${accentBorder[card.accent]}`}
          >
            <p className="eyebrow">{card.label}</p>
            <p
              className={`text-lg font-bold font-mono ${accentText[card.accent]}`}
            >
              {card.value}
            </p>
            <p className="text-[0.65rem] text-text-muted leading-relaxed">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
