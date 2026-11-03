"use client";

import BaseNode from "./BaseNode";
import { usePipelineStore } from "@/store/usePipelineStore";
import CopyButton from "@/components/shared/CopyButton";

export default function ExecutionResultNode() {
  const txBuild = usePipelineStore((s) => s.txBuild);
  const walletInfo = usePipelineStore((s) => s.walletInfo);

  return (
    <BaseNode
      nodeId="execution-result"
      title="Execution Result"
      subtitle={walletInfo?.network ?? "Preview"}
      showSourceHandle={false}
    >
      {txBuild ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 text-muted">
            <span>tx hash</span>
            <span className="font-mono text-secondary truncate max-w-[120px]">
              {txBuild.txHash.slice(0, 16)}…
            </span>
            <CopyButton text={txBuild.txHash} />
          </div>
          <div className="flex justify-between text-muted">
            <span>kind</span>
            <span className="text-secondary">{txBuild.kind}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>network</span>
            <span className="text-secondary">{txBuild.network ?? "Preview"}</span>
          </div>
          {txBuild.explorerUrl && (
            <a
              href={txBuild.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-[10px] text-accent-cyan hover:underline"
            >
              View on CardanoScan →
            </a>
          )}
        </div>
      ) : (
        <div className="text-muted italic py-2">No TX yet</div>
      )}
    </BaseNode>
  );
}
