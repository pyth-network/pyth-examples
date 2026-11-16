"use client";

import { useState } from "react";

interface SwapPanelProps {
  riskSymbol: string;
  stableSymbol: string;
  currentPrice: number;
  oracleFreshness: string;
  haircutBps: number;
}

export function SwapPanel({
  riskSymbol,
  stableSymbol,
  currentPrice,
  oracleFreshness,
  haircutBps,
}: SwapPanelProps) {
  const [direction, setDirection] = useState<"derisk" | "reentry">("derisk");
  const [amount, setAmount] = useState("");

  const fromSymbol = direction === "derisk" ? riskSymbol : stableSymbol;
  const toSymbol = direction === "derisk" ? stableSymbol : riskSymbol;

  const numAmount = parseFloat(amount) || 0;
  const haircutMultiplier = Math.max(0, 1 - haircutBps / 10_000);
  const isPriceValid = Number.isFinite(currentPrice) && currentPrice > 0;
  const estimatedOutput =
    isPriceValid
      ? direction === "derisk"
        ? numAmount * currentPrice * haircutMultiplier
        : numAmount / currentPrice * haircutMultiplier
      : 0;

  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h3 className="text-sm font-semibold text-text">Swap</h3>
        <p className="text-xs text-text-muted mt-1">
          Policy-gated execution through approved routes
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Direction Toggle */}
        <div className="flex gap-1 p-1 bg-bg-soft rounded-xl">
          <button
            onClick={() => setDirection("derisk")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              direction === "derisk"
                ? "bg-red-muted text-red"
                : "text-text-muted hover:text-text"
            }`}
          >
            De-Risk
          </button>
          <button
            onClick={() => setDirection("reentry")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              direction === "reentry"
                ? "bg-green-muted text-green"
                : "text-text-muted hover:text-text"
            }`}
          >
            Re-Entry
          </button>
        </div>

        {/* From */}
        <div className="space-y-2">
          <label className="eyebrow">From</label>
          <div className="flex items-center gap-3 bg-bg-soft rounded-xl p-3 border border-line-soft focus-within:border-accent/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-accent-muted text-accent flex items-center justify-center text-xs font-bold">
              {fromSymbol.slice(0, 2)}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-lg font-semibold text-text outline-none placeholder:text-text-muted/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm font-mono text-text-secondary">
              {fromSymbol}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="w-8 h-8 rounded-lg bg-panel-hover border border-line flex items-center justify-center">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-text-muted"
            >
              <path d="M7 3v8M4 8l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* To */}
        <div className="space-y-2">
          <label className="eyebrow">To (estimated)</label>
          <div className="flex items-center gap-3 bg-bg-soft rounded-xl p-3 border border-line-soft">
            <div className="w-8 h-8 rounded-lg bg-green-muted text-green flex items-center justify-center text-xs font-bold">
              {toSymbol.slice(0, 2)}
            </div>
            <span className="flex-1 text-lg font-semibold text-text-secondary">
              {numAmount > 0 ? estimatedOutput.toFixed(2) : "0.00"}
            </span>
            <span className="text-sm font-mono text-text-secondary">
              {toSymbol}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Oracle Price</span>
            <span className="font-mono text-text-secondary">
              {isPriceValid ? `$${currentPrice.toFixed(4)}` : "Unavailable"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Oracle Freshness</span>
            <span className="font-mono text-green">{oracleFreshness}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Haircut</span>
            <span className="font-mono text-text-secondary">
              {(haircutBps / 100).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Route</span>
            <span className="font-mono text-accent">DexHunter</span>
          </div>
        </div>

        {!isPriceValid && (
          <div className="rounded-xl border border-red/20 bg-red-muted px-3 py-2 text-xs text-red">
            Oracle price is invalid or stale for swap estimation. Execution stays disabled until a valid price is available.
          </div>
        )}

        {/* Button */}
        <button
          disabled={numAmount <= 0 || !isPriceValid}
          className="w-full btn-primary justify-center disabled:opacity-40 disabled:cursor-not-allowed mt-2"
        >
          {direction === "derisk" ? "Execute De-Risk" : "Execute Re-Entry"}
        </button>

        <p className="text-[0.6rem] text-text-muted text-center font-mono">
          Requires governance approval &middot; Policy-gated
        </p>
      </div>
    </div>
  );
}
