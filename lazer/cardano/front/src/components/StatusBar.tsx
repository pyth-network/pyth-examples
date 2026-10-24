"use client";

import { usePipelineStore } from "@/store/usePipelineStore";
import type { NodeId } from "@/types/nodes";
import { NODE_LAYER, LAYER_COLORS } from "@/types/nodes";
import { ChevronRight } from "lucide-react";

const PIPELINE_STEPS: { id: NodeId; label: string }[] = [
  { id: "pyth-source", label: "Fetch" },
  { id: "normalize", label: "Normalize" },
  { id: "decision", label: "Decide" },
  { id: "tx-builder", label: "Build TX" },
  { id: "execution-result", label: "Execute" },
];

function getStepColor(state: string, nodeId: NodeId): string {
  if (state === "running") return "var(--accent-amber)";
  if (state === "success") return "var(--accent-green)";
  if (state === "error") return "var(--accent-red)";
  // idle/blocked: use layer color (dimmed)
  return LAYER_COLORS[NODE_LAYER[nodeId]].primary;
}

export default function StatusBar() {
  const nodeStates = usePipelineStore((s) => s.nodeStates);
  const walletInfo = usePipelineStore((s) => s.walletInfo);

  // Derive pipeline status
  const states = Object.values(nodeStates);
  const hasError = states.some((s) => s.state === "error");
  const isRunning = states.some((s) => s.state === "running");
  const hasTx = nodeStates["execution-result"]?.state === "success";
  const allIdle = states.every((s) => s.state === "idle");

  let statusText = "IDLE — ready to run";
  let statusColor = "var(--text-muted)";
  if (hasError) {
    statusText = "ERROR — check logs";
    statusColor = "var(--accent-red)";
  } else if (isRunning) {
    const running = PIPELINE_STEPS.find(
      (s) => nodeStates[s.id]?.state === "running"
    );
    statusText = `RUNNING — ${running?.label ?? "…"}`;
    statusColor = "var(--accent-amber)";
  } else if (hasTx) {
    statusText = "TX READY — transaction built";
    statusColor = "var(--accent-green)";
  } else if (!allIdle) {
    statusText = "IN PROGRESS";
    statusColor = "var(--accent-cyan)";
  }

  return (
    <div
      className="flex items-center justify-between border-b px-4 py-2"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border-default)",
      }}
    >
      {/* Left: Status */}
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-xs font-medium" style={{ color: statusColor }}>
          {statusText}
        </span>
      </div>

      {/* Center: Breadcrumb */}
      <div className="flex items-center gap-1 text-[11px]">
        {PIPELINE_STEPS.map((step, i) => {
          const ns = nodeStates[step.id];
          const color = getStepColor(ns?.state ?? "idle", step.id);
          return (
            <span key={step.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted" />}
              <span style={{ color }} className="font-medium">
                {step.label}
              </span>
            </span>
          );
        })}
      </div>

      {/* Right: Network badge */}
      <div className="flex items-center gap-2">
        <span className="rounded-sm px-2 py-0.5 text-[10px] font-medium text-secondary" style={{ backgroundColor: "var(--bg-elevated)" }}>
          {walletInfo?.network ?? "Preprod"}
        </span>
      </div>
    </div>
  );
}
