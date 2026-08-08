"use client";

import { useEffect, useRef, useState } from "react";
import BaseNode from "./BaseNode";
import { usePipelineStore } from "@/store/usePipelineStore";
import type { PriceUpdate } from "@/types";

export default function PythSourceNode() {
  const price = usePipelineStore((s) => s.price);
  const livePrice = usePipelineStore((s) => s.livePrice);
  const setLivePrice = usePipelineStore((s) => s.setLivePrice);
  const fetchPrice = usePipelineStore((s) => s.fetchPrice);
  const [flash, setFlash] = useState(false);
  const prevCents = useRef<string | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/price/stream");
    es.onmessage = (e) => {
      try {
        const p: PriceUpdate = JSON.parse(e.data);
        if (prevCents.current !== null && prevCents.current !== p.priceUsdCents) {
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
        }
        prevCents.current = p.priceUsdCents;
        setLivePrice(p);
      } catch { /* ignore bad frames */ }
    };
    return () => es.close();
  }, [setLivePrice]);

  const displayPrice = price ?? livePrice;
  const usdDisplay = displayPrice
    ? `$${(Number(displayPrice.priceUsdCents) / 100).toFixed(4)}`
    : null;

  return (
    <BaseNode
      nodeId="pyth-source"
      title="Pyth Lazer"
      subtitle="ADA / USD"
      showTargetHandle={false}
      onRun={fetchPrice}
      runLabel="Fetch Price"
    >
      {displayPrice ? (
        <div className="space-y-1.5">
          <div
            className={`text-xl font-bold transition-colors duration-300 ${flash ? "text-accent-green" : "text-foreground"}`}
          >
            {usdDisplay}
          </div>
          <div className="flex justify-between text-muted">
            <span>cents</span>
            <span className="text-secondary font-mono">{displayPrice.priceUsdCents}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>feed</span>
            <span className="text-secondary font-mono">{displayPrice.feedId}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>time</span>
            <span className="text-secondary text-[10px]">
              {new Date(displayPrice.timestamp).toLocaleTimeString()}
            </span>
          </div>
          {livePrice && !price && (
            <div className="text-[9px] text-muted italic">live stream</div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-2">
          <span
            className="inline-block h-2 w-2 rounded-full animate-pulse"
            style={{ backgroundColor: "var(--accent-amber)" }}
          />
          <span className="text-muted italic">Connecting to Pyth…</span>
        </div>
      )}
    </BaseNode>
  );
}
