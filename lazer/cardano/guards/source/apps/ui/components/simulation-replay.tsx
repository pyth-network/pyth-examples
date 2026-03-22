"use client";

import { useState } from "react";
import { getStageAppearance } from "@/lib/stage";
import { DemoFrame } from "@/lib/types";

interface SimulationReplayProps {
  frames: DemoFrame[];
}

export function SimulationReplay({ frames }: SimulationReplayProps) {
  const [activeFrame, setActiveFrame] = useState(0);

  if (frames.length === 0) {
    return (
      <div className="glass-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text">
              Simulation Replay
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Step through a risk scenario demonstration
            </p>
          </div>
          <span className="chip bg-panel border border-line text-text-secondary">
            No frames
          </span>
        </div>
        <div className="p-5 text-sm text-text-muted">
          No simulation frames available yet.
        </div>
      </div>
    );
  }

  const frame = frames[activeFrame];
  const stageAppearance = getStageAppearance(frame.stage);

  const finiteBalances = frames.map((entry) =>
    Number.isFinite(entry.balance) ? entry.balance : 0,
  );
  const rawMaxBalance = Math.max(...finiteBalances, 0);
  const maxBalance =
    rawMaxBalance > 0 && Number.isFinite(rawMaxBalance) ? rawMaxBalance : 1;
  const chartHeight = 120;
  const chartWidth = 400;
  const stepX = chartWidth / (frames.length - 1 || 1);

  const points = frames
    .map((entry, index) => {
      const safeBalance = Number.isFinite(entry.balance) ? entry.balance : 0;
      const normalizedY = chartHeight - (safeBalance / maxBalance) * chartHeight;

      return `${index * stepX},${normalizedY}`;
    })
    .join(" ");

  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">
            Simulation Replay
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Step through a risk scenario demonstration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveFrame(Math.max(0, activeFrame - 1))}
            disabled={activeFrame === 0}
            className="btn-ghost !px-2 !py-1 disabled:opacity-30"
            aria-label="Go to previous frame"
            title="Go to previous frame"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3L5 7l4 4" />
            </svg>
          </button>
          <span className="text-xs font-mono text-text-secondary min-w-[60px] text-center">
            {activeFrame + 1} / {frames.length}
          </span>
          <button
            type="button"
            onClick={() =>
              setActiveFrame(Math.min(frames.length - 1, activeFrame + 1))
            }
            disabled={activeFrame === frames.length - 1}
            className="btn-ghost !px-2 !py-1 disabled:opacity-30"
            aria-label="Go to next frame"
            title="Go to next frame"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3l4 4-4 4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Chart */}
        <div className="bg-bg-soft rounded-xl p-4 border border-line-soft">
          <svg
            viewBox={`-10 -10 ${chartWidth + 20} ${chartHeight + 20}`}
            className="w-full h-32"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1={0}
                y1={chartHeight * (1 - ratio)}
                x2={chartWidth}
                y2={chartHeight * (1 - ratio)}
                stroke="#22252f"
                strokeWidth="0.5"
              />
            ))}
            {/* Area */}
            <polygon
              points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`}
              fill="url(#blueGrad)"
              opacity="0.15"
            />
            {/* Line */}
            <polyline
              points={points}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Active dot */}
            {frames.map((f, i) => (
              <circle
                key={i}
                cx={i * stepX}
                cy={
                  chartHeight -
                  ((Number.isFinite(f.balance) ? f.balance : 0) / maxBalance) *
                    chartHeight
                }
                r={i === activeFrame ? 5 : 3}
                fill={i === activeFrame ? getStageAppearance(f.stage).chartColor : "#22252f"}
                stroke={getStageAppearance(f.stage).chartColor}
                strokeWidth={i === activeFrame ? 2 : 1}
                className="cursor-pointer"
                onClick={() => setActiveFrame(i)}
              />
            ))}
            <defs>
              <linearGradient
                id="blueGrad"
                x1="0"
                y1="0"
                x2="0"
                y2={chartHeight}
              >
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Frame Info */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-soft rounded-xl p-3 border border-line-soft">
            <p className="eyebrow">Balance</p>
            <p className="text-base font-bold font-mono text-text mt-1">
              ${frame.balance.toLocaleString()}
            </p>
          </div>
          <div className="bg-bg-soft rounded-xl p-3 border border-line-soft">
            <p className="eyebrow">Stable Ratio</p>
            <p className="text-base font-bold font-mono text-text mt-1">
              {(frame.stableRatio * 100).toFixed(0)}%
            </p>
          </div>
          <div className="bg-bg-soft rounded-xl p-3 border border-line-soft">
            <p className="eyebrow">Stage</p>
            <p
              className="text-base font-bold mt-1"
              style={{ color: stageAppearance.chartColor }}
            >
              {stageAppearance.label}
            </p>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-bg-soft rounded-xl p-4 border border-line-soft space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: stageAppearance.chartColor }}
            />
            <p className="text-xs font-mono font-medium text-text-secondary">
              {frame.trigger}
            </p>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            {frame.explanation}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5 justify-center">
          {frames.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveFrame(i)}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                i === activeFrame
                  ? "bg-accent w-6"
                  : "bg-line hover:bg-text-muted"
              }`}
              aria-label={`Go to frame ${i + 1}`}
              aria-current={i === activeFrame ? "step" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
