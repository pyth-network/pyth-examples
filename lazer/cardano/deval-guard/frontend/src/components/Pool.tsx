interface Props {
  stats: {
    totalDeposits: number;
    totalReserved: number;
    premiumsEarned: number;
  };
}

function toAda(lovelace: number): string {
  return (lovelace / 1_000_000).toFixed(2);
}

export default function Pool({ stats }: Props) {
  const available = stats.totalDeposits - stats.totalReserved;
  const utilization = stats.totalDeposits > 0
    ? ((stats.totalReserved / stats.totalDeposits) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="card">
      <h2>Liquidity Pool</h2>

      <div className="stat">
        <span className="stat-label">Total Deposits</span>
        <span className="stat-value">{toAda(stats.totalDeposits)} ADA</span>
      </div>
      <div className="stat">
        <span className="stat-label">Reserved (active policies)</span>
        <span className="stat-value">{toAda(stats.totalReserved)} ADA</span>
      </div>
      <div className="stat">
        <span className="stat-label">Available</span>
        <span className="stat-value" style={{ color: "var(--success)" }}>
          {toAda(available)} ADA
        </span>
      </div>
      <div className="stat">
        <span className="stat-label">Utilization</span>
        <span className="stat-value">{utilization}%</span>
      </div>
      <div className="stat">
        <span className="stat-label">Premiums Earned</span>
        <span className="stat-value">{toAda(stats.premiumsEarned)} ADA</span>
      </div>

      <div className="deval-meter" style={{ marginTop: "0.75rem" }}>
        <div
          className="deval-meter-fill"
          style={{
            width: `${Math.min(100, parseFloat(utilization))}%`,
            background: parseFloat(utilization) > 80 ? "var(--danger)" : "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}
