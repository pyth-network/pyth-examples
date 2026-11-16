"use client";

import { ArrowRight } from "lucide-react";
import { FadeUp } from "./animations";

export function CTASection() {
  return (
    <section className="relative py-32 bg-[#070612] overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, #7c6ff720 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 text-center">
        <FadeUp>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium text-white leading-tight mb-6">
            Stop watching your treasury.
            <br />
            <span className="font-serif italic text-[#7c6ff7]">
              Start protecting it.
            </span>
          </h2>
        </FadeUp>

        <FadeUp delay={0.15}>
          <p className="text-white/50 text-lg leading-relaxed max-w-2xl mx-auto mb-10">
            Define policy bounds once, then let the execution flow react automatically
            when the treasury breaches protected thresholds.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="flex items-center justify-center">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-white text-[#070612] px-8 py-4 text-base font-semibold hover:bg-white/90 transition-all cursor-pointer"
            >
              Open Demo
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
