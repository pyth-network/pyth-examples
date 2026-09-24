"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, TrendingUp } from "lucide-react";
import { getStageAppearance } from "@/lib/stage";
import {
  mockDatasetOptions,
  mockStrategyOptions,
  runMockBacktest,
  type MockDatasetId,
  type MockBacktestPoint,
  type MockStrategyId,
} from "@/lib/mock-backtest";
import type { VaultBootstrapDraft } from "@/lib/vault-lab";

interface HistoricalStrategyLabProps {
  draft: VaultBootstrapDraft;
  dataset: MockDatasetId;
}

function Chart({
  points,
  activeIndex,
  setActiveIndex,
}: {
  points: MockBacktestPoint[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  const width = 720;
  const height = 180;
  const maxPrice = Math.max(...points.map((point) => point.adaPrice));
  const minPrice = Math.min(...points.map((point) => point.adaPrice));
  const range = Math.max(maxPrice - minPrice, 0.01);
  const stepX = width / Math.max(points.length - 1, 1);
  const line = points
    .map((point, index) => {
      const normalizedY = height - ((point.adaPrice - minPrice) / range) * height;
      return `${index * stepX},${normalizedY}`;
    })
    .join(" ");

  return (
    <svg viewBox={`-10 -10 ${width + 20} ${height + 20}`} className="h-56 w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={0}
          y1={height * ratio}
          x2={width}
          y2={height * ratio}
          stroke="#22252f"
          strokeWidth="0.5"
        />
      ))}
      <polyline
        points={line}
        fill="none"
        stroke="#7c6ff7"
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((point, index) => {
        const y = height - ((point.adaPrice - minPrice) / range) * height;
        const active = index === activeIndex;
        const color = getStageAppearance(point.stage).chartColor;
        return (
          <circle
            key={point.index}
            cx={index * stepX}
            cy={y}
            r={point.executionLabel ? (active ? 5 : 3.5) : active ? 4 : 2.5}
            fill={active ? color : point.executionLabel ? color : "#2a2940"}
            stroke={color}
            strokeWidth={active ? 2 : 1}
            className="cursor-pointer"
            onClick={() => setActiveIndex(index)}
          />
        );
      })}
    </svg>
  );
}

export function HistoricalStrategyLab({ draft, dataset }: HistoricalStrategyLabProps) {
  const [strategy, setStrategy] = useState<MockStrategyId>("guards_ladder");
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);

  const result = useMemo(
    () =>
      runMockBacktest(draft, {
        strategy,
        dataset,
        days: 7,
        intervalMinutes: 15,
        referenceSymbol: draft.referenceSymbol,
      }),
    [dataset, draft, strategy],
  );

  const activePoint = result.points[activeIndex] ?? result.points[0];
  const appearance = getStageAppearance(activePoint?.stage ?? "normal");

  useEffect(() => {
    if (!autoplay || typeof window === "undefined") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % result.points.length);
    }, 220);

    return () => window.clearInterval(timer);
  }, [autoplay, result.points.length]);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text">Mock replay lab</h3>
            <p className="mt-1 text-xs text-text-muted">
              Seven days of 15-minute price states. Execute the strategy engine repeatedly and inspect how stages and swaps evolve.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="chip">7d</span>
            <span className="chip">15m</span>
            <span className="chip">
              Dataset: {mockDatasetOptions.find((option) => option.id === dataset)?.label ?? dataset}
            </span>
            <button
              type="button"
              onClick={() => setAutoplay((current) => !current)}
              className="btn-ghost !px-3 !py-2"
            >
              <Play className="h-3.5 w-3.5" />
              {autoplay ? "Pause" : "Play"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {mockStrategyOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setStrategy(option.id);
                  setActiveIndex(0);
                }}
                className={`rounded-2xl border p-4 text-left transition ${
                  strategy === option.id
                    ? "border-accent bg-accent/8"
                    : "border-line bg-bg-soft hover:border-accent/25"
                }`}
              >
                <p className="text-sm font-semibold text-text">{option.label}</p>
                <p className="mt-2 text-xs leading-relaxed text-text-muted">{option.description}</p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-line bg-bg-soft p-4">
            <Chart points={result.points} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
            <input
              type="range"
              min={0}
              max={Math.max(result.points.length - 1, 0)}
              value={activeIndex}
              onChange={(event) => setActiveIndex(Number(event.target.value))}
              className="mt-3 w-full accent-[#7c6ff7]"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-bg-soft p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-text">Backtest summary</span>
              </div>
              <span className={appearance.chipClass}>{appearance.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line px-3 py-3">
                <p className="eyebrow">Executions</p>
                <p className="mt-2 text-sm font-semibold text-text">{result.summary.executionCount}</p>
              </div>
              <div className="rounded-xl border border-line px-3 py-3">
                <p className="eyebrow">Min liquid value</p>
                <p className="mt-2 text-sm font-semibold text-text">${result.summary.minLiquidValueFiat.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-line px-3 py-3">
                <p className="eyebrow">Final stable ratio</p>
                <p className="mt-2 text-sm font-semibold text-text">{(result.summary.finalStableRatio * 100).toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-line px-3 py-3">
                <p className="eyebrow">Last point</p>
                <p className="mt-2 text-sm font-semibold text-text">{activePoint?.label}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-bg-soft p-4 space-y-3">
            <div>
              <p className="eyebrow">Active point</p>
              <p className="mt-2 text-lg font-semibold text-text">ADA ${activePoint?.adaPrice.toFixed(4)}</p>
              <p className="mt-1 text-sm text-text-secondary">EMA ${activePoint?.adaEmaPrice.toFixed(4)} · confidence ±${activePoint?.adaConfidence.toFixed(4)}</p>
            </div>
            <div>
              <p className="eyebrow">Strategy trigger</p>
              <p className="mt-2 text-sm text-text-secondary">{activePoint?.trigger}</p>
            </div>
            <div>
              <p className="eyebrow">Execution</p>
              <p className="mt-2 text-sm text-text-secondary">
                {activePoint?.executionLabel ?? "No execution at this step."}
              </p>
            </div>
            <div>
              <p className="eyebrow">Reference asset ({draft.referenceSymbol})</p>
              <p className="mt-2 text-sm text-text-secondary">${activePoint?.referencePrice.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
