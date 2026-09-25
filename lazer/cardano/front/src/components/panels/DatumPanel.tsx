"use client";

import { usePipelineStore } from "@/store/usePipelineStore";
import type { OracleDatum } from "@/types";

function DatumDisplay({ datum }: { datum: OracleDatum }) {
  switch (datum.kind) {
    case "AnyPrice":
      return <div className="text-accent-green">Any price accepted</div>;
    case "MinPrice":
      return (
        <div className="flex gap-4">
          <span className="text-muted w-24">min cents</span>
          <span className="text-foreground font-semibold">
            {datum.minPriceUsdCents} (${(datum.minPriceUsdCents / 100).toFixed(2)})
          </span>
        </div>
      );
    case "MaxPrice":
      return (
        <div className="flex gap-4">
          <span className="text-muted w-24">max cents</span>
          <span className="text-foreground font-semibold">
            {datum.maxPriceUsdCents} (${(datum.maxPriceUsdCents / 100).toFixed(2)})
          </span>
        </div>
      );
    case "PriceRange":
      return (
        <>
          <div className="flex gap-4">
            <span className="text-muted w-24">lo cents</span>
            <span className="text-foreground font-semibold">
              {datum.loCents} (${(datum.loCents / 100).toFixed(2)})
            </span>
          </div>
          <div className="flex gap-4">
            <span className="text-muted w-24">hi cents</span>
            <span className="text-foreground font-semibold">
              {datum.hiCents} (${(datum.hiCents / 100).toFixed(2)})
            </span>
          </div>
        </>
      );
  }
}

export default function DatumPanel() {
  const datum = usePipelineStore((s) => s.datum);
  const txBuild = usePipelineStore((s) => s.txBuild);

  if (!datum) {
    return null;
  }

  return (
    <div className="border-t pt-3 space-y-3" style={{ borderColor: "var(--border-default)" }}>
      <div>
        <div className="text-[10px] font-semibold text-muted uppercase mb-1">
          Datum ({datum.kind})
        </div>
        <div className="space-y-1 pl-2 font-mono text-[11px]">
          <DatumDisplay datum={datum} />
        </div>
      </div>

      {txBuild && (
        <div>
          <div className="text-[10px] font-semibold text-muted uppercase mb-1">
            Redeemer
          </div>
          <div className="pl-2 font-mono text-[11px]">
            <div className="flex gap-4">
              <span className="text-muted w-24">type</span>
              <span className="text-accent-green">
                {txBuild.kind === "spend" ? "Pyth Lazer payload" : "— (lock TX)"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
