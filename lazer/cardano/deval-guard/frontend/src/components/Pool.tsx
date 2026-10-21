import { useState } from "react";

interface Props {
  stats: {
    totalDeposits: number;
    totalReserved: number;
    premiumsEarned: number;
  };
  connected: boolean;
  onDeposit: (amountAda: number) => void;
  depositing: boolean;
}

function toAda(lovelace: number): string {
  return (lovelace / 1_000_000).toFixed(2);
}

export default function Pool({ stats, connected, onDeposit, depositing }: Props) {
  const [depositAmount, setDepositAmount] = useState("50");
  const available = stats.totalDeposits - stats.totalReserved;
  const utilization = stats.totalDeposits > 0
    ? ((stats.totalReserved / stats.totalDeposits) * 100).toFixed(1)
    : "0.0";

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (amt > 0) onDeposit(amt);
  };

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

      {connected && (
        <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <label className="price-label">Add Liquidity (ADA)</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="number"
              min="5"
              step="5"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleDeposit}
              disabled={depositing || !parseFloat(depositAmount)}
              style={{ flex: 0, whiteSpace: "nowrap", minWidth: 120 }}
            >
              {depositing ? "Depositing..." : "Deposit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
