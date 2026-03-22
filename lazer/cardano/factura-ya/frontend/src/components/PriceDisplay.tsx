import { useEffect, useState } from "react";

export function PriceDisplay() {
  const [adaPrice, setAdaPrice] = useState<number | null>(null);

  useEffect(() => {
    // In production: connects to PythPriceClient WebSocket
    // For MVP: mock or fetch from indexer
    const mockPrice = () => {
      // Simulate ADA/USD around $0.65-0.75
      setAdaPrice(0.65 + Math.random() * 0.1);
    };

    mockPrice();
    const interval = setInterval(mockPrice, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="price-display">
      <span className="price-label">ADA/USD</span>
      <span className="price-value">
        {adaPrice !== null ? `$${adaPrice.toFixed(4)}` : "Loading..."}
      </span>
      <span className="price-source">via Pyth</span>
    </div>
  );
}
