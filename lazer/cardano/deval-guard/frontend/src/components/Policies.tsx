import type { Policy } from "../App";

interface Props {
  policies: Policy[];
  currentPrice: number;
  onClaim: (id: string) => void;
}

export default function Policies({ policies, currentPrice, onClaim }: Props) {
  if (policies.length === 0) {
    return (
      <div className="card full-width">
        <h2>Your Policies</h2>
        <p style={{ color: "var(--text-dim)", textAlign: "center", padding: "2rem 0" }}>
          No active policies. Subscribe to get coverage.
        </p>
      </div>
    );
  }

  return (
    <div className="card full-width">
      <h2>Your Policies</h2>
      {policies.map((policy) => {
        const devalPct =
          ((currentPrice - policy.strikePrice) / policy.strikePrice) * 100;
        const eligible = devalPct >= policy.thresholdPct && policy.status === "Active";
        const meterPct = Math.max(0, Math.min(100, (devalPct / policy.thresholdPct) * 100));

        return (
          <div key={policy.id} className="policy-item">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 600 }}>
                {policy.thresholdPct}% coverage
              </span>
              <span className={`status status-${policy.status.toLowerCase()}`}>
                {policy.status}
              </span>
            </div>

            <div className="stat">
              <span className="stat-label">Strike Price</span>
              <span className="stat-value">{policy.strikePrice.toFixed(2)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Current Devaluation</span>
              <span className="stat-value" style={{
                color: devalPct >= policy.thresholdPct ? "var(--success)" : devalPct > 0 ? "var(--warning)" : "var(--text)"
              }}>
                {devalPct.toFixed(1)}%
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Premium / Payout</span>
              <span className="stat-value">{policy.premium} / {policy.payout} ADA</span>
            </div>
            <div className="stat">
              <span className="stat-label">Expires</span>
              <span className="stat-value">{policy.expiryDate}</span>
            </div>

            <div className="deval-meter">
              <div
                className="deval-meter-fill"
                style={{
                  width: `${meterPct}%`,
                  background: eligible ? "var(--success)" : devalPct > 0 ? "var(--warning)" : "var(--border)",
                }}
              />
            </div>

            {eligible && (
              <button className="btn-success" onClick={() => onClaim(policy.id)} style={{ marginTop: "0.5rem" }}>
                Claim {policy.payout} ADA
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
