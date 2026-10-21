"use client";

import { usePipelineStore } from "@/store/usePipelineStore";
import { NODE_LABELS } from "@/types/nodes";
import StatusBadge from "@/components/shared/StatusBadge";
import JsonViewer from "@/components/shared/JsonViewer";

export default function InspectorPanel() {
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);
  const nodeStates = usePipelineStore((s) => s.nodeStates);

  if (!selectedNodeId) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted italic">
        Click a node to inspect
      </div>
    );
  }

  const ns = nodeStates[selectedNodeId];
  const label = NODE_LABELS[selectedNodeId];

  return (
    <div className="space-y-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="text-[10px] font-mono text-muted">{selectedNodeId}</div>
        </div>
        <StatusBadge state={ns.state} />
      </div>

      {ns.lastRun && (
        <div className="text-[10px] text-muted">
          status: <span className="text-secondary">{ns.state}</span> ·{" "}
          {new Date(ns.lastRun).toLocaleTimeString()}
        </div>
      )}

      {ns.error && (
        <div className="rounded border border-accent-red/30 bg-accent-red/10 p-2 text-[11px] text-accent-red">
          {ns.error}
        </div>
      )}

      <JsonViewer data={ns.input} label="INPUT" defaultOpen />
      <JsonViewer data={ns.output} label="OUTPUT" defaultOpen />
    </div>
  );
}
