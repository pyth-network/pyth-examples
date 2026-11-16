"use client";

import { usePipelineStore } from "@/store/usePipelineStore";
import CopyButton from "@/components/shared/CopyButton";
import type { OracleDatum, TxBuildResult } from "@/types";
import { EXPLORER_URLS } from "@/lib/constants";

function datumSummary(datum: OracleDatum): string[] {
  switch (datum.kind) {
    case "AnyPrice":
      return ["kind: AnyPrice"];
    case "MinPrice":
      return [`kind: MinPrice`, `min: ${datum.minPriceUsdCents} cents ($${(datum.minPriceUsdCents / 100).toFixed(2)})`];
    case "MaxPrice":
      return [`kind: MaxPrice`, `max: ${datum.maxPriceUsdCents} cents ($${(datum.maxPriceUsdCents / 100).toFixed(2)})`];
    case "PriceRange":
      return [
        `kind: PriceRange`,
        `lo: ${datum.loCents} cents ($${(datum.loCents / 100).toFixed(2)})`,
        `hi: ${datum.hiCents} cents ($${(datum.hiCents / 100).toFixed(2)})`,
      ];
  }
}

function explorerUrl(txHash: string, network?: string): string {
  const net = (network ?? "preprod").toLowerCase();
  const base = EXPLORER_URLS[net] ?? EXPLORER_URLS.preprod;
  return `${base}/${txHash}`;
}

function TxHashRow({ label, result }: { label: string; result: TxBuildResult }) {
  const url = explorerUrl(result.txHash, result.network);
  return (
    <div>
      <div className="text-[10px] text-muted uppercase mb-1">{label}</div>
      <div
        className="flex items-center gap-1 rounded border p-2 font-mono text-xs text-secondary"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-primary)" }}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate hover:text-accent-cyan transition-colors"
        >
          {result.txHash}
        </a>
        <CopyButton text={result.txHash} />
      </div>
    </div>
  );
}

export default function TxViewerPanel() {
  const lockResult = usePipelineStore((s) => s.lockResult);
  const spendResult = usePipelineStore((s) => s.spendResult);
  const txBuild = usePipelineStore((s) => s.txBuild);
  const lockConfirmed = usePipelineStore((s) => s.lockConfirmed);
  const lockConfirming = usePipelineStore((s) => s.lockConfirming);

  if (!txBuild) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted italic">
        Run the pipeline to create an escrow transaction
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto">
      {lockResult && <TxHashRow label="Lock TX" result={lockResult} />}
      {spendResult && <TxHashRow label="Spend TX" result={spendResult} />}
      {!lockResult && !spendResult && <TxHashRow label="TX Hash" result={txBuild} />}

      {lockResult && !spendResult && (
        <div
          className="flex items-center gap-2 rounded border p-2 text-xs"
          style={{
            borderColor: lockConfirmed ? "var(--accent-green)" : "var(--accent-amber)",
            backgroundColor: lockConfirmed ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
          }}
        >
          {lockConfirming && (
            <span
              className="inline-block h-3 w-3 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent-amber)", borderTopColor: "transparent" }}
            />
          )}
          <span style={{ color: lockConfirmed ? "var(--accent-green)" : "var(--accent-amber)" }}>
            {lockConfirmed ? "Lock confirmed — spending…" : "Waiting for on-chain confirmation…"}
          </span>
        </div>
      )}

      {spendResult && (
        <div
          className="flex items-center gap-2 rounded border p-2 text-xs"
          style={{ borderColor: "var(--accent-green)", backgroundColor: "rgba(34,197,94,0.08)" }}
        >
          <span style={{ color: "var(--accent-green)" }}>
            Escrow complete — ADA unlocked
          </span>
        </div>
      )}

      <div>
        <div className="text-[10px] text-muted uppercase mb-2">Escrow Flow</div>
        <div className="flex items-center justify-center gap-1 text-xs">
          <div
            className="rounded border px-3 py-2 text-center"
            style={{ borderColor: "var(--accent-cyan)", backgroundColor: "var(--accent-cyan)", color: "#000", opacity: 0.9 }}
          >
            <div className="text-[10px] font-semibold">Wallet</div>
          </div>
          <div className="flex items-center text-muted">
            <span className="text-lg">→</span>
            <span className="text-[10px] mx-0.5">
              {txBuild.lovelace ? `${(parseInt(txBuild.lovelace) / 1e6).toFixed(1)} ADA` : "2 ADA"}
            </span>
            <span className="text-lg">→</span>
          </div>
          <div
            className="rounded border px-3 py-2 text-center"
            style={{ borderColor: "var(--accent-purple)", backgroundColor: "var(--accent-purple)", color: "#000", opacity: 0.9 }}
          >
            <div className="text-[10px] font-semibold">Script</div>
          </div>
          {spendResult && (
            <>
              <div className="flex items-center text-muted">
                <span className="text-lg">→</span>
                <span className="text-[10px] mx-0.5">unlock</span>
                <span className="text-lg">→</span>
              </div>
              <div
                className="rounded border px-3 py-2 text-center"
                style={{ borderColor: "var(--accent-green)", backgroundColor: "var(--accent-green)", color: "#000", opacity: 0.9 }}
              >
                <div className="text-[10px] font-semibold">Wallet</div>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className="rounded border p-2 text-[11px] font-mono"
        style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-primary)" }}
      >
        <div className="text-muted mb-1">datum:</div>
        <div className="pl-2 space-y-0.5 text-secondary">
          {datumSummary(txBuild.datum).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
