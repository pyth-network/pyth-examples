"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FadeUp } from "./animations";

const steps = [
  {
    number: "01",
    title: "Observe",
    description:
      "Read Pyth price, EMA, confidence, and freshness for the protected asset and any reference asset.",
    detail:
      "The collector polls Pyth oracle feeds and caches snapshots. Every data point is timestamped and validated for freshness before reaching the engine.",
    accent: "#7c6ff7",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Evaluate",
    description:
      "Evaluate drawdown, liquid value floors, and oracle quality against the treasury policy ladder.",
    detail:
      "The risk engine computes drawdown (spot vs EMA), checks absolute fiat floors, and validates oracle confidence. The result determines the next stage on the risk ladder.",
    accent: "#3b82f6",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20l4-4 3 3 5-6 4 4" />
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Authorize",
    description:
      "Authorize a bounded execution intent with approved route, max size, and oracle evidence.",
    detail:
      "Every intent carries snapshot IDs, a reason hash, and expiry. It can only execute through governance-approved routes with capped volume. No open-ended permissions.",
    accent: "#22c55e",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L20 7v5c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V7l8-5z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Execute",
    description:
      "Execute automatically inside governance-approved route and volume limits, then record for audit.",
    detail:
      "The keeper swaps from the bounded execution bucket through DexHunter or the fallback venue. Every result is anchored with oracle evidence for full traceability.",
    accent: "#f0bf5f",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
];

const ladderStages = [
  {
    name: "Normal",
    trigger: "Drawdown < watch threshold",
    action: "Hold allocation, monitor oracle feeds continuously.",
    color: "#22c55e",
  },
  {
    name: "Watch",
    trigger: "Drawdown exceeds watch band",
    action: "Increase monitoring frequency. Prepare execution routes and validate venue liquidity.",
    color: "#f0bf5f",
  },
  {
    name: "Partial De-Risk",
    trigger: "Drawdown exceeds partial threshold",
    action: "Swap a portion of the risk asset into the approved stable to rebuild the protected floor.",
    color: "#ef6f6c",
  },
  {
    name: "Full Stable Exit",
    trigger: "Floor breached or drawdown critical",
    action: "Emergency exit: move all remaining risk exposure into stable. Fiat floor is the priority.",
    color: "#ef4444",
  },
  {
    name: "Frozen",
    trigger: "Oracle stale or confidence too wide",
    action: "All execution halted. The engine does not trade on unreliable data. Resumes when oracle quality recovers.",
    color: "#9896aa",
  },
  {
    name: "Auto Re-Entry",
    trigger: "Recovery confirmed + cooldown elapsed",
    action: "Gradually restore risk allocation. Hysteresis prevents oscillation — a single tick is not enough.",
    color: "#7c6ff7",
  },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [activeLadder, setActiveLadder] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="relative py-32 bg-[#070612]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <FadeUp>
          <p className="text-[#7c6ff7] text-sm font-mono font-medium tracking-widest uppercase mb-4">
            How It Works
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium text-white leading-tight max-w-3xl">
            Oracle signal.
            <br />
            Policy ladder.
            <br />
            Bounded execution.
          </h2>
          <p className="mt-6 text-white/45 text-base md:text-lg leading-relaxed max-w-2xl">
            Guards is not an arbitrary trading bot. Governance defines the policy,
            the approved routes, and the volume limits. Automation only executes inside
            that envelope.
          </p>
        </FadeUp>

        {/* Interactive Steps */}
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
          {/* Left: Step selector */}
          <div className="space-y-3">
            {steps.map((step, i) => (
              <motion.button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(i)}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={
                  reduceMotion ? { duration: 0 } : { delay: i * 0.1, duration: 0.4 }
                }
                aria-pressed={activeStep === i}
                aria-label={`Select step ${step.number}: ${step.title}`}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 cursor-pointer group ${
                  activeStep === i
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-transparent hover:border-white/5 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      activeStep === i ? "opacity-100" : "opacity-30 group-hover:opacity-50"
                    }`}
                    style={{
                      background: `${step.accent}15`,
                      color: step.accent,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span
                        className="text-xs font-mono font-bold"
                        style={{ color: activeStep === i ? step.accent : "#5e5c72" }}
                      >
                        {step.number}
                      </span>
                      <h3
                        className="text-base font-semibold transition-colors duration-300"
                        style={{ color: activeStep === i ? step.accent : "#9896aa" }}
                      >
                        {step.title}
                      </h3>
                    </div>
                    <p className={`text-sm leading-relaxed transition-colors duration-300 ${
                      activeStep === i ? "text-white/50" : "text-white/25"
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Right: Active step detail */}
          <div className="lg:sticky lg:top-32">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 relative overflow-hidden"
              >
                {/* Glow */}
                <div
                  className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-10 blur-3xl pointer-events-none"
                  style={{ background: steps[activeStep].accent }}
                />

                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${steps[activeStep].accent}15`,
                        color: steps[activeStep].accent,
                      }}
                    >
                      {steps[activeStep].icon}
                    </div>
                    <div>
                      <span className="text-xs font-mono" style={{ color: steps[activeStep].accent }}>
                        Step {steps[activeStep].number}
                      </span>
                      <h3 className="text-xl font-semibold text-white">
                        {steps[activeStep].title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-white/60 text-base leading-relaxed mb-6">
                    {steps[activeStep].detail}
                  </p>

                  {/* Progress indicator */}
                  <div className="flex gap-2">
                    {steps.map((step, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveStep(i)}
                        aria-label={`Go to step ${step.number}: ${step.title}`}
                        aria-pressed={i === activeStep}
                        className="cursor-pointer"
                      >
                        <div
                          className={`h-1 rounded-full transition-all duration-300 ${
                            i === activeStep ? "w-8" : "w-2"
                          }`}
                          style={{
                            background: i === activeStep ? steps[activeStep].accent : "#2a2940",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Risk Ladder - Expanded */}
        <FadeUp delay={0.2}>
          <div className="mt-24 rounded-2xl border border-white/6 bg-[#0a0b14] p-8 md:p-10">
            <div className="mb-10">
              <p className="text-[#7c6ff7] text-sm font-mono font-medium tracking-widest uppercase mb-3">
                Risk Ladder
              </p>
              <h3 className="text-2xl md:text-3xl font-medium text-white mb-4">
                Six stages. Zero ambiguity.
              </h3>
              <p className="text-white/40 text-base leading-relaxed max-w-3xl">
                The risk ladder is a deterministic state machine — not a set of alerts.
                Each stage has a precise trigger and a defined action. The engine escalates
                and de-escalates automatically based on oracle signals, and freezes execution
                when data quality degrades.
              </p>
            </div>

            <div className="space-y-2">
              {ladderStages.map((stage, i) => (
                <motion.div
                  key={stage.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={
                    reduceMotion ? { duration: 0 } : { delay: i * 0.08, duration: 0.4 }
                  }
                >
                  <button
                    type="button"
                    onClick={() => setActiveLadder(activeLadder === i ? null : i)}
                    className="w-full text-left cursor-pointer"
                    aria-expanded={activeLadder === i}
                    aria-controls={activeLadder === i ? `risk-ladder-panel-${i}` : undefined}
                  >
                    <div
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-[250ms] ${
                        activeLadder === i
                          ? "border-white/10 bg-white/[0.03]"
                          : "border-transparent hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Stage number + color */}
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: stage.color }}
                        />
                        <span className="text-xs font-mono text-white/30">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: stage.color }}
                        >
                          {stage.name}
                        </span>
                      </div>

                      {/* Trigger */}
                      <span className="text-sm text-white/35 flex-1 hidden md:block">
                        {stage.trigger}
                      </span>

                      {/* Expand indicator */}
                      <motion.svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-white/20 flex-shrink-0"
                        animate={{ rotate: activeLadder === i ? 180 : 0 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
                      >
                        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    </div>
                  </button>

                  <AnimatePresence>
                    {activeLadder === i && (
                      <motion.div
                        id={`risk-ladder-panel-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-[52px] pr-4 pb-4 pt-1">
                          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 space-y-3">
                            <div>
                              <p className="text-[0.65rem] font-mono text-white/25 uppercase tracking-widest mb-1">
                                Trigger
                              </p>
                              <p className="text-sm text-white/60">
                                {stage.trigger}
                              </p>
                            </div>
                            <div>
                              <p className="text-[0.65rem] font-mono text-white/25 uppercase tracking-widest mb-1">
                                Action
                              </p>
                              <p className="text-sm text-white/60">
                                {stage.action}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
