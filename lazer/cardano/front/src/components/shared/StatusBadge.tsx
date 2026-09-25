"use client";

import type { NodeState } from "@/types/nodes";

const stateStyles: Record<NodeState, string> = {
  idle: "bg-[var(--border-light)]/20 text-[var(--text-muted)]",
  running: "bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]",
  success: "bg-[var(--accent-green)]/20 text-[var(--accent-green)]",
  error: "bg-[var(--accent-red)]/20 text-[var(--accent-red)]",
  blocked: "bg-[var(--text-muted)]/20 text-[var(--text-muted)]",
};

const dotStyles: Record<NodeState, string> = {
  idle: "bg-[var(--text-muted)]",
  running: "bg-[var(--accent-amber)] animate-pulse",
  success: "bg-[var(--accent-green)]",
  error: "bg-[var(--accent-red)]",
  blocked: "bg-[var(--text-muted)]",
};

export default function StatusBadge({ state }: { state: NodeState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${stateStyles[state]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[state]}`} />
      {state}
    </span>
  );
}
