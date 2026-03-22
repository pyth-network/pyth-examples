import { useState } from "react";

const THRESHOLDS = [
  { label: "5%", bps: 500, pct: 5 },
  { label: "10%", bps: 1000, pct: 10 },
  { label: "15%", bps: 1500, pct: 15 },
  { label: "20%", bps: 2000, pct: 20 },
];

const PERIODS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

const PAYOUT_MULTIPLIER = 2;

interface Props {
  currentPrice: number;
  connected: boolean;
  onSubscribe: (thresholdPct: number, periodDays: number, premiumAda: number) => void;
}

export default function Subscribe({ currentPrice, connected, onSubscribe }: Props) {
  const [threshold, setThreshold] = useState(1);
  const [period, setPeriod] = useState(0);
  const [premium, setPremium] = useState("5");

  const selectedThreshold = THRESHOLDS[threshold];
  const selectedPeriod = PERIODS[period];
  const premiumAda = parseFloat(premium) || 0;
  const payoutAda = premiumAda * PAYOUT_MULTIPLIER;

  const handleSubscribe = () => {
    if (premiumAda <= 0) return;
    onSubscribe(selectedThreshold.pct, selectedPeriod.days, premiumAda);
  };

  return (
    <div className="card">
      <h2>Buy Coverage</h2>

      <label className="price-label">Devaluation Threshold</label>
      <select value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}>
        {THRESHOLDS.map((t, i) => (
          <option key={i} value={i}>{t.label}</option>
        ))}
      </select>
      <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "-0.5rem", marginBottom: "0.75rem" }}>
        Triggers at ~{(currentPrice * (1 - selectedThreshold.pct / 100)).toFixed(4)} USD/ADA
      </div>

      <label className="price-label">Coverage Period</label>
      <select value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
        {PERIODS.map((p, i) => (
          <option key={i} value={i}>{p.label}</option>
        ))}
      </select>

      <label className="price-label">Premium (ADA)</label>
      <input
        type="number"
        min="1"
        step="1"
        value={premium}
        onChange={(e) => setPremium(e.target.value)}
        placeholder="5"
      />

      {premiumAda > 0 && (
        <div className="confirmation">
          If ADA drops {selectedThreshold.label}, you receive{" "}
          <strong style={{ color: "var(--success)", fontSize: "1.1em" }}>{payoutAda.toFixed(0)} ADA</strong>
        </div>
      )}

      <div className="stat">
        <span className="stat-label">Strike price</span>
        <span className="stat-value">{currentPrice.toFixed(4)} USD</span>
      </div>
      <div className="stat">
        <span className="stat-label">Payout multiplier</span>
        <span className="stat-value">{PAYOUT_MULTIPLIER}x</span>
      </div>

      <button
        onClick={handleSubscribe}
        disabled={!connected || premiumAda <= 0}
        style={{ marginTop: "0.75rem" }}
      >
        {connected ? `Pay ${premiumAda} ADA & Subscribe` : "Connect wallet first"}
      </button>
    </div>
  );
}
