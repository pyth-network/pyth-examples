"use client";

import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "green" | "yellow" | "red" | "default";
}

const accentGlow: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#f0bf5f",
  red: "#ef6f6c",
  default: "transparent",
};

const accentValueStyles: Record<string, string> = {
  blue: "text-blue",
  green: "text-green",
  yellow: "text-yellow",
  red: "text-red",
  default: "text-text",
};

export function MetricCard({
  label,
  value,
  sub,
  accent = "default",
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel p-5 space-y-2 card-hover relative overflow-hidden"
    >
      {/* Subtle corner glow */}
      {accent !== "default" && (
        <div
          className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-15 blur-2xl pointer-events-none"
          style={{ background: accentGlow[accent] }}
        />
      )}
      <p className="eyebrow relative">{label}</p>
      <p className={`metric-value relative ${accentValueStyles[accent]}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-text-muted font-mono relative">{sub}</p>
      )}
    </motion.div>
  );
}
