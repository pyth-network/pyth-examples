"use client";

import { FadeUp } from "./animations";

const signals = [
  {
    signal: "price",
    usage: "Spot valuation for liquid value calculation",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#7c6ff7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    signal: "emaPrice",
    usage: "Baseline for drawdown measurement — spot vs exponential moving average",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#7c6ff7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 14c3-8 5-2 7-10 2 8 4 2 7 10" />
      </svg>
    ),
  },
  {
    signal: "confidence",
    usage: "Widening interval triggers Frozen state — blocks all execution",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#7c6ff7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" />
        <path d="M10 7v3l2 1" />
      </svg>
    ),
  },
  {
    signal: "freshness",
    usage: "Stale data halts the engine — no blind execution ever",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#7c6ff7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3v7l4 2" />
        <circle cx="10" cy="10" r="7" />
      </svg>
    ),
  },
];

export function PythSection() {
  return (
    <section className="relative py-32 bg-[#0a0b14]">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, #7c6ff715 0%, transparent 50%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left: Oracle signals */}
          <FadeUp>
            <div className="space-y-6">
              {signals.map((s, i) => (
                <FadeUp key={s.signal} delay={i * 0.1}>
                  <div className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-[#7c6ff7]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#7c6ff7]/20 transition-colors">
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-white font-mono text-sm font-semibold mb-1">
                        {s.signal}
                      </p>
                      <p className="text-white/40 text-sm leading-relaxed">
                        {s.usage}
                      </p>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </FadeUp>

          {/* Right: Copy */}
          <FadeUp delay={0.2}>
            <div>
              <div className="flex items-center gap-3 mb-6">
                <p className="text-sm font-mono font-medium tracking-widest uppercase text-[#7c6ff7]">
                  Powered by
                </p>
              </div>
              <div className="mb-8">
                <svg viewBox="0 0 120 32" className="h-8 text-white" fill="currentColor">
                  <text x="0" y="24" fontSize="26" fontWeight="700" fontFamily="system-ui, sans-serif" letterSpacing="-1">
                    PYTH
                  </text>
                </svg>
                <p className="text-white/20 text-xs font-mono mt-2">
                  Network
                </p>
              </div>
              <h2 className="text-3xl md:text-4xl font-medium text-white leading-tight mb-6">
                Oracle data is not decorative.
                <br />
                <span className="text-white/40">It drives execution.</span>
              </h2>
              <p className="text-white/50 text-base leading-relaxed">
                Every execution intent carries oracle snapshot IDs. Every
                decision can be independently verified. Guards doesn&apos;t just
                read prices — it reasons about data quality, confidence, and
                staleness before authorizing a single swap.
              </p>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
