interface Props {
  price: number;
  onPriceChange: (price: number) => void;
}

export default function PriceDisplay({ price, onPriceChange }: Props) {
  return (
    <div className="card price-display">
      <h2>ARS / USD Exchange Rate</h2>
      <div className="price-big">{price.toFixed(2)}</div>
      <div className="price-label">via Pyth Oracle (feed #2582)</div>

      <div style={{ marginTop: "1rem" }}>
        <label className="price-label">
          Simulate price change (demo):
        </label>
        <input
          type="range"
          min={800}
          max={2000}
          step={0.01}
          value={price}
          onChange={(e) => onPriceChange(parseFloat(e.target.value))}
          style={{ marginTop: "0.5rem" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-dim)" }}>
          <span>800 (appreciation)</span>
          <span>2000 (devaluation)</span>
        </div>
      </div>
    </div>
  );
}
