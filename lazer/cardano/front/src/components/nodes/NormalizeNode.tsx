"use client";

import BaseNode from "./BaseNode";
import { usePipelineStore } from "@/store/usePipelineStore";

export default function NormalizeNode() {
  const price = usePipelineStore((s) => s.price);

  return (
    <BaseNode
      nodeId="normalize"
      title="Normalize"
      subtitle="cents conversion"
    >
      {price ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-muted">
            <span>USD</span>
            <span className="text-secondary">
              ${(Number(price.priceUsdCents) / 100).toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between text-muted">
            <span>cents</span>
            <span className="font-mono text-secondary">
              {price.priceUsdCents}
            </span>
          </div>
          <div className="flex justify-between text-muted">
            <span>feed</span>
            <span className="font-mono text-secondary">
              {price.feedId}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-muted italic py-2">Awaiting price</div>
      )}
    </BaseNode>
  );
}
