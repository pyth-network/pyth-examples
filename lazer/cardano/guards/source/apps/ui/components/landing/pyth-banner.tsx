"use client";

import { motion } from "framer-motion";
import { FadeUp } from "./animations";

export function PythBanner() {
  return (
    <section className="relative overflow-hidden bg-[#070612] py-16 md:py-20">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 10%, rgba(124,111,247,0.24) 50%, transparent 90%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(124,111,247,0.08) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 text-center lg:px-12">
        <FadeUp>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.34em] text-white/35 md:text-sm">
            Powered by
          </p>
        </FadeUp>

        <FadeUp delay={0.08}>
          <motion.img
            src="/pyth-logo.png"
            alt="Pyth Network"
            width="320"
            height="96"
            className="h-12 w-auto brightness-0 invert md:h-16"
            initial={{ opacity: 0.82, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            loading="lazy"
            decoding="async"
          />
        </FadeUp>

        <FadeUp delay={0.16}>
          <p className="max-w-xl text-sm leading-relaxed text-white/38 md:text-base">
            Real-time oracle data behind each risk signal, threshold check, and
            bounded execution decision.
          </p>
        </FadeUp>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 10%, rgba(124,111,247,0.14) 50%, transparent 90%)",
        }}
      />
    </section>
  );
}
