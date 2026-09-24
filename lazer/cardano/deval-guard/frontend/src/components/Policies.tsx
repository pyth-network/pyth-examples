import type { Policy } from "../App";

interface Props {
  myPolicies: Policy[];
  otherPolicies: Policy[];
  currentPrice: number;
  connected: boolean;
  onClaim: (id: string) => void;
  onExpire: (id: string) => void;
}

function PolicyCard({ policy, currentPrice, onClaim, onExpire, isMine }: {
  policy: Policy;
  currentPrice: number;
  onClaim: (id: string) => void;
  onExpire: (id: string) => void;
  isMine: boolean;
}) {
  const isActive = policy.status === "Active";
  const devalPct = isActive
    ? ((currentPrice - policy.strikePrice) / policy.strikePrice) * 100
    : policy.thresholdPct;
  const eligible = isActive && devalPct >= policy.thresholdPct;
  const meterPct = isActive
    ? Math.max(0, Math.min(100, (devalPct / policy.thresholdPct) * 100))
    : 100;

  return (
    <div className="policy-item">
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
        <span className="stat-value">${policy.strikePrice.toFixed(4)}</span>
      </div>
      {isActive && (
        <div className="stat">
          <span className="stat-label">Current Devaluation</span>
          <span className="stat-value" style={{
            color: devalPct >= policy.thresholdPct ? "var(--success)" : devalPct > 0 ? "var(--warning)" : "var(--text)"
          }}>
            {devalPct.toFixed(1)}%
          </span>
        </div>
      )}
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
            background: policy.status === "Claimed" ? "var(--success)"
              : eligible ? "var(--success)"
              : devalPct > 0 ? "var(--warning)"
              : "var(--border)",
          }}
        />
      </div>

      {isMine && eligible && (
        <button className="btn-success" onClick={() => onClaim(policy.id)} style={{ marginTop: "0.5rem" }}>
          Claim {policy.payout} ADA
        </button>
      )}

      {isMine && isActive && !eligible && (
        <button
          onClick={() => onExpire(policy.id)}
          style={{
            marginTop: "0.5rem",
            background: "transparent",
            border: "1px dashed var(--border)",
            color: "var(--text-dim)",
            fontSize: "0.75rem",
            opacity: 0.5,
          }}
        >
          [demo only] Force Expire
        </button>
      )}
    </div>
  );
}

export default function Policies({ myPolicies, otherPolicies, currentPrice, connected, onClaim, onExpire }: Props) {
  const hasAny = myPolicies.length > 0 || otherPolicies.length > 0;

  if (!hasAny) {
    return (
      <div className="card full-width">
        <h2>Policies</h2>
        <p style={{ color: "var(--text-dim)", textAlign: "center", padding: "2rem 0" }}>
          {connected ? "No policies yet. Subscribe to get coverage." : "No active policies on-chain."}
        </p>
      </div>
    );
  }

  return (
    <>
      {connected && myPolicies.length > 0 && (
        <div className="card full-width">
          <h2>Your Policies</h2>
          {myPolicies.map((p) => (
            <PolicyCard key={p.id} policy={p} currentPrice={currentPrice} onClaim={onClaim} onExpire={onExpire} isMine={true} />
          ))}
        </div>
      )}

      {otherPolicies.length > 0 && (
        <div className="card full-width">
          <h2>Active Policies</h2>
          {otherPolicies.map((p) => (
            <PolicyCard key={p.id} policy={p} currentPrice={currentPrice} onClaim={onClaim} onExpire={onExpire} isMine={false} />
          ))}
        </div>
      )}
    </>
  );
}
