"use client";

import { useCallback, useState } from "react";

import { PythChart } from "@/components/PythChart";

// `symbol` is the value the History API expects. The Pyth Pro `/v1/symbols`
// catalog exposes fully-qualified names (e.g. `Crypto.BTC/USD`); the shorter
// forms shown in the docs table (e.g. `BTC/USD`) are ambiguous today and
// return `symbol not found` — see the PR description for the discrepancy.
const FEEDS = [
  { symbol: "Crypto.BTC/USD", label: "BTC/USD" },
  { symbol: "Crypto.ETH/USD", label: "ETH/USD" },
  { symbol: "Crypto.SOL/USD", label: "SOL/USD" },
];

export default function HomePage() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleUpdated = useCallback((at: Date) => {
    setLastUpdated((previous) => (previous && previous > at ? previous : at));
  }, []);

  return (
    <main className="page">
      <header className="page__header">
        <h1>Pyth Pro Price Charts</h1>
        <p>
          Last updated:{" "}
          {lastUpdated ? lastUpdated.toLocaleTimeString() : "loading…"}
        </p>
      </header>
      <section className="page__grid">
        {FEEDS.map(({ symbol, label }) => (
          <PythChart
            key={symbol}
            symbol={symbol}
            label={label}
            onUpdated={handleUpdated}
          />
        ))}
      </section>
    </main>
  );
}
