"use client";

import BaseNode from "./BaseNode";
import { usePipelineStore } from "@/store/usePipelineStore";

const actionColors: Record<string, string> = {
  lock: "var(--accent-cyan)",
  spend: "var(--accent-green)",
  block: "var(--accent-red)",
};

export default function DecisionNode() {
  const decision = usePipelineStore((s) => s.decision);
  const config = usePipelineStore((s) => s.config.decisionConfig);
  const decide = usePipelineStore((s) => s.decide);

  return (
    <BaseNode
      nodeId="decision"
      title="Decision Engine"
      subtitle="block / lock / spend"
      onRun={decide}
      runLabel="Decide"
    >
      <div className="space-y-2">
        {decision && (
          <div className="flex justify-center">
            <span
              className="rounded px-3 py-1 text-sm font-bold uppercase"
              style={{
                backgroundColor: `${actionColors[decision.action]}20`,
                color: actionColors[decision.action],
              }}
            >
              {decision.action}
            </span>
          </div>
        )}
        {decision && (
          <div className="text-[10px] text-muted text-center">
            {decision.reason}
          </div>
        )}
        <div className="flex justify-between text-muted">
          <span>datum</span>
          <span className="text-secondary">{config.datumKind}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>max age</span>
          <span className="text-secondary">{config.maxAgeSeconds}s</span>
        </div>
      </div>
    </BaseNode>
  );
}
