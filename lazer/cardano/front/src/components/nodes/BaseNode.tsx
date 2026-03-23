"use client";

import { Handle, Position } from "@xyflow/react";
import type { ReactNode } from "react";
import type { NodeId, NodeState } from "@/types/nodes";
import { NODE_LAYER, LAYER_COLORS, NODE_ACCENT_OVERRIDE } from "@/types/nodes";
import { usePipelineStore } from "@/store/usePipelineStore";
import StatusBadge from "@/components/shared/StatusBadge";

const stateColorMap: Record<NodeState, string | null> = {
  idle: null, // uses layer color
  running: "var(--accent-amber)",
  success: "var(--accent-green)",
  error: "var(--accent-red)",
  blocked: "var(--text-muted)",
};

interface BaseNodeProps {
  nodeId: NodeId;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onRun?: () => void;
  runLabel?: string;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
  showBottomHandle?: boolean;
  showTopHandle?: boolean;
}

export default function BaseNode({
  nodeId,
  title,
  subtitle,
  children,
  onRun,
  runLabel,
  showSourceHandle = true,
  showTargetHandle = true,
  showBottomHandle = false,
  showTopHandle = false,
}: BaseNodeProps) {
  const nodeState = usePipelineStore((s) => s.nodeStates[nodeId]);
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);
  const selectNode = usePipelineStore((s) => s.selectNode);
  const openConfigModal = usePipelineStore((s) => s.openConfigModal);
  const nodeConfig = usePipelineStore((s) => s.nodeConfigs[nodeId]);
  const isSelected = selectedNodeId === nodeId;
  const state = nodeState?.state ?? "idle";

  const layer = NODE_LAYER[nodeId];
  const layerColors = NODE_ACCENT_OVERRIDE[nodeId] ?? LAYER_COLORS[layer];
  const customColor = nodeConfig?.customColor;
  const displayLabel = nodeConfig?.customLabel || title;

  // Border color: state override > custom color > layer color
  const borderColor = stateColorMap[state] ?? customColor ?? layerColors.primary;
  // Button and handle color
  const accentColor = customColor ?? layerColors.primary;
  // Header tint
  const headerBg = `${layerColors.primary}0d`;

  return (
    <div
      onClick={() => selectNode(nodeId)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        openConfigModal(nodeId);
      }}
      className={`
        relative min-w-[220px] rounded-lg border-2 p-0 transition-all cursor-pointer
        ${isSelected ? "ring-1 ring-white/20" : ""}
        ${state === "running" ? "animate-pulse-border" : ""}
      `}
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{ borderColor: "var(--border-default)", backgroundColor: headerBg }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground truncate">
              {displayLabel}
            </span>
            <span
              className="shrink-0 rounded px-1 py-0 text-[8px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${layerColors.primary}20`,
                color: layerColors.primary,
              }}
            >
              {layer}
            </span>
          </div>
          {subtitle && (
            <div className="text-[10px] text-muted">{subtitle}</div>
          )}
        </div>
        <StatusBadge state={state} />
      </div>

      {/* Content */}
      <div className="px-3 py-2 text-xs">{children}</div>

      {/* Run Button */}
      {onRun && (
        <div className="border-t px-3 py-2" style={{ borderColor: "var(--border-default)" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
            disabled={state === "running"}
            className="w-full rounded py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50"
            style={{
              backgroundColor: accentColor,
              color: "#000",
            }}
          >
            {state === "running" ? "Running…" : (runLabel ?? `Run ${displayLabel}`)}
          </button>
        </div>
      )}

      {/* Handles */}
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !rounded-full !border-2"
          style={{ background: "var(--bg-elevated)", borderColor: accentColor }}
        />
      )}
      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !rounded-full !border-2"
          style={{ background: "var(--bg-elevated)", borderColor: accentColor }}
        />
      )}
      {showTopHandle && (
        <Handle
          type="source"
          position={Position.Top}
          id="top"
          className="!h-3 !w-3 !rounded-full !border-2"
          style={{ background: "var(--bg-elevated)", borderColor: accentColor }}
        />
      )}
      {showBottomHandle && (
        <Handle
          type="target"
          position={Position.Bottom}
          id="bottom"
          className="!h-3 !w-3 !rounded-full !border-2"
          style={{ background: "var(--bg-elevated)", borderColor: accentColor }}
        />
      )}
    </div>
  );
}
