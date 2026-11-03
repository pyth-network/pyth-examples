"use client";

import { useEffect } from "react";
import { usePipelineStore } from "@/store/usePipelineStore";
import { RotateCcw } from "lucide-react";
import { DATUM_KIND_OPTIONS } from "@/lib/constants";
import type { OracleDatum } from "@/types";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full"
      style={{ backgroundColor: ok ? "var(--accent-green)" : "var(--accent-red, #ef4444)" }}
    />
  );
}

export default function ControlsPanel() {
  const config = usePipelineStore((s) => s.config);
  const setDecisionConfig = usePipelineStore((s) => s.setDecisionConfig);
  const nodeConfigs = usePipelineStore((s) => s.nodeConfigs);
  const updateNodeConfig = usePipelineStore((s) => s.updateNodeConfig);
  const reset = usePipelineStore((s) => s.reset);
  const serviceStatus = usePipelineStore((s) => s.serviceStatus);
  const fetchServiceStatus = usePipelineStore((s) => s.fetchServiceStatus);

  useEffect(() => {
    fetchServiceStatus();
  }, [fetchServiceStatus]);

  const { datumKind } = config.decisionConfig;
  const showMin = datumKind === "MinPrice" || datumKind === "PriceRange";
  const showMax = datumKind === "MaxPrice" || datumKind === "PriceRange";
  const lockAmount = nodeConfigs["tx-builder"]?.lockAmount ?? "2000000";
  const lockAda = (parseInt(lockAmount) / 1e6).toFixed(1);

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
        Escrow Config
      </h2>

      <button
        onClick={reset}
        className="w-full rounded-lg border py-2 text-sm text-secondary transition-colors hover:text-foreground"
        style={{ borderColor: "var(--border-light)" }}
      >
        <RotateCcw className="mr-1.5 inline h-3.5 w-3.5" />
        Reset
      </button>

      {serviceStatus && (
        <div className="space-y-1 rounded-md border border-white/10 bg-white/[0.02] p-2 text-[11px]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">Services</div>
          <div className="flex items-center gap-1.5">
            <StatusDot ok={serviceStatus.pyth} />
            <span className={serviceStatus.pyth ? "text-secondary" : "text-red-400"}>
              Pyth Lazer {serviceStatus.pyth ? "ready" : "— set PYTH_ACCESS_TOKEN"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusDot ok={serviceStatus.blockfrost} />
            <span className={serviceStatus.blockfrost ? "text-secondary" : "text-red-400"}>
              Blockfrost {serviceStatus.blockfrost ? "ready" : "— set BLOCKFROST_API_KEY"}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2 border-t pt-3" style={{ borderColor: "var(--border-default)" }}>
        <label className="block">
          <span className="text-xs text-muted">Lock amount (ADA)</span>
          <input
            type="number"
            step="0.5"
            min="1.5"
            value={parseFloat(lockAda)}
            onChange={(e) => {
              const ada = parseFloat(e.target.value) || 2;
              updateNodeConfig("tx-builder", { lockAmount: String(Math.round(ada * 1e6)) });
            }}
            className="mt-1 w-full rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-foreground font-mono"
            style={{ borderColor: "var(--border-default)" }}
          />
        </label>

        <label className="block">
          <span className="text-xs text-muted">Datum condition</span>
          <select
            value={datumKind}
            onChange={(e) =>
              setDecisionConfig({
                datumKind: e.target.value as OracleDatum["kind"],
              })
            }
            className="mt-1 w-full rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-foreground"
            style={{ borderColor: "var(--border-default)" }}
          >
            {DATUM_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {showMin && (
          <label className="block">
            <span className="text-xs text-muted">
              {datumKind === "PriceRange" ? "Lo (USD cents)" : "Min price (USD cents)"}
            </span>
            <input
              type="number"
              value={config.decisionConfig.minPriceUsdCents}
              onChange={(e) =>
                setDecisionConfig({
                  minPriceUsdCents: Number(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-foreground"
              style={{ borderColor: "var(--border-default)" }}
            />
          </label>
        )}

        {showMax && (
          <label className="block">
            <span className="text-xs text-muted">
              {datumKind === "PriceRange" ? "Hi (USD cents)" : "Max price (USD cents)"}
            </span>
            <input
              type="number"
              value={config.decisionConfig.maxPriceUsdCents}
              onChange={(e) =>
                setDecisionConfig({
                  maxPriceUsdCents: Number(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-foreground"
              style={{ borderColor: "var(--border-default)" }}
            />
          </label>
        )}

        <label className="block">
          <span className="text-xs text-muted">Max age (seconds)</span>
          <input
            type="number"
            value={config.decisionConfig.maxAgeSeconds}
            onChange={(e) =>
              setDecisionConfig({ maxAgeSeconds: Number(e.target.value) || 60 })
            }
            className="mt-1 w-full rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-foreground"
            style={{ borderColor: "var(--border-default)" }}
          />
        </label>
      </div>
    </div>
  );
}
