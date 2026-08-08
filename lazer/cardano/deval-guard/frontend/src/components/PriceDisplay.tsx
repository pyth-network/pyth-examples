import { useState, useEffect, useRef } from "react";

interface Props {
  price: number;
  onPriceChange: (price: number) => void;
  demoMode: boolean;
}

// ADA/USD feed on Pyth Hermes (free, CORS-enabled)
const PYTH_ADA_USD = "https://hermes.pyth.network/v2/updates/price/latest?ids[]=0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d";

export default function PriceDisplay({ price, onPriceChange, demoMode }: Props) {
  const [isLive, setIsLive] = useState(!demoMode);
  const [liveError, setLiveError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLivePrice = async () => {
    try {
      const res = await fetch(PYTH_ADA_USD);
      const data = await res.json();
      if (data?.parsed?.[0]?.price) {
        const priceData = data.parsed[0].price;
        const p = Number(priceData.price) * Math.pow(10, Number(priceData.expo));
        if (p > 0) {
          onPriceChange(p);
          setLiveError(false);
        }
      }
    } catch {
      setLiveError(true);
    }
  };

  const startLive = () => {
    fetchLivePrice();
    intervalRef.current = setInterval(fetchLivePrice, 5000);
    setIsLive(true);
  };

  const stopLive = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsLive(false);
  };

  // Start live on mount if not demo
  useEffect(() => {
    if (!demoMode) startLive();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [demoMode]);

  // When switching to demo mode, stop live
  useEffect(() => {
    if (demoMode && isLive) stopLive();
  }, [demoMode]);

  return (
    <div className="card price-display">
      <h2>ADA / USD Exchange Rate</h2>
      <div className="price-big">${price.toFixed(4)}</div>
      <div className="price-label">
        {isLive ? (
          <span style={{ color: "var(--success)" }}>
            {liveError ? "Pyth fetch error — retrying..." : "Live from Pyth Oracle"}
          </span>
        ) : (
          <span style={{ color: "var(--warning)" }}>Demo simulation mode</span>
        )}
      </div>

      {/* Slider only in demo mode */}
      {demoMode && (
        <div style={{ marginTop: "1rem" }}>
          <label className="price-label">Simulate price change:</label>
          <input
            type="range"
            min={0.05}
            max={1.0}
            step={0.0001}
            value={price}
            onChange={(e) => onPriceChange(parseFloat(e.target.value))}
            style={{ marginTop: "0.5rem" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-dim)" }}>
            <span>$0.05 (drop)</span>
            <span>$1.00 (moon)</span>
          </div>
        </div>
      )}
    </div>
  );
}
