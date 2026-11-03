"use client";

import BaseNode from "./BaseNode";
import { usePipelineStore } from "@/store/usePipelineStore";
import { Check } from "lucide-react";

export default function TxBuilderNode() {
  const txBuild = usePipelineStore((s) => s.txBuild);
  const runAll = usePipelineStore((s) => s.runAll);
  const nodeConfigs = usePipelineStore((s) => s.nodeConfigs);

  const lockAmount = nodeConfigs["tx-builder"]?.lockAmount ?? "2000000";
  const lockAda = (parseInt(lockAmount) / 1e6).toFixed(1);
  const kind = txBuild?.kind ?? "escrow";

  return (
    <BaseNode
      nodeId="tx-builder"
      title="TX Builder"
      subtitle={kind}
      onRun={runAll}
      runLabel="Run Escrow"
      showBottomHandle
    >
      <div className="space-y-1.5">
        <div className="flex justify-center">
          <span className="rounded bg-accent-blue/20 px-2 py-0.5 text-sm font-bold uppercase text-accent-blue">
            {kind}
          </span>
        </div>
        {txBuild ? (
          <>
            <div className="flex justify-between text-muted">
              <span>datum</span>
              <span className="inline-flex items-center gap-1 text-secondary">
                inline <Check className="h-3 w-3 text-[var(--accent-green)]" />
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>redeemer</span>
              <span className="text-secondary">
                {txBuild.kind === "spend" ? "Pyth payload" : "—"}
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>status</span>
              <span className="font-semibold" style={{ color: "var(--accent-green)" }}>
                {txBuild.status}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-muted">
            <span>amount</span>
            <span className="text-secondary font-mono">{lockAda} ADA</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
}
