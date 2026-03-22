"use client";

import { useState, useEffect, useCallback } from "react";
import { usePipelineStore } from "@/store/usePipelineStore";
import { X } from "lucide-react";
import { NODE_LABELS, NODE_LAYER, LAYER_COLORS, NODE_ACCENT_OVERRIDE } from "@/types/nodes";
import type { NodeId, NodeConfig } from "@/types/nodes";
import { DATUM_KIND_OPTIONS, NETWORK_OPTIONS } from "@/lib/constants";

type Tab = "parameters" | "visual";

function ParametersTab({ nodeId, config, onChange }: {
  nodeId: NodeId;
  config: NodeConfig;
  onChange: (patch: Partial<NodeConfig>) => void;
}) {
  switch (nodeId) {
    case "pyth-source":
      return (
        <div className="space-y-3">
          <div>
            <span className="text-xs text-muted">Feed</span>
            <div className="mt-1 rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-secondary font-mono" style={{ borderColor: "var(--border-default)" }}>
              ADA/USD (feed 16)
            </div>
          </div>
          <div className="text-[10px] text-muted italic">
            Feed is fixed to ADA/USD via Pyth Lazer WebSocket
          </div>
        </div>
      );

    case "normalize":
      return (
        <div className="space-y-3">
          <div>
            <span className="text-xs text-muted">Conversion</span>
            <div className="mt-1 rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-secondary" style={{ borderColor: "var(--border-default)" }}>
              mantissa × 10^(exponent + 2) → USD cents
            </div>
          </div>
          <div className="text-[10px] text-muted italic">
            Normalization is handled by Pyth Lazer SDK
          </div>
        </div>
      );

    case "decision":
      return (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-muted">Max Age (seconds)</span>
            <input
              type="number"
              value={config.maxAgeSeconds ?? ""}
              placeholder="Use global default"
              onChange={(e) => onChange({ maxAgeSeconds: e.target.value ? Number(e.target.value) : undefined })}
              className="mt-1 w-full rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-foreground"
              style={{ borderColor: "var(--border-default)" }}
            />
          </label>
          <div className="text-[10px] text-muted italic">
            Datum condition is set in the Controls panel
          </div>
        </div>
      );

    case "tx-builder":
      return (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-muted">Lock Amount (lovelace)</span>
            <input
              type="text"
              value={config.lockAmount ?? "2000000"}
              onChange={(e) => onChange({ lockAmount: e.target.value })}
              className="mt-1 w-full rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-foreground font-mono"
              style={{ borderColor: "var(--border-default)" }}
            />
            <span className="text-[10px] text-muted mt-0.5 block">
              {config.lockAmount ? `${(parseInt(config.lockAmount) / 1e6).toFixed(1)} ADA` : "2.0 ADA"}
            </span>
          </label>
        </div>
      );

    case "execution-result":
      return (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-muted">Network</span>
            <select
              value={config.network ?? "Preprod"}
              onChange={(e) => onChange({ network: e.target.value })}
              className="mt-1 w-full rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-foreground"
              style={{ borderColor: "var(--border-default)" }}
            >
              {NETWORK_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      );

    case "aiken-validator":
      return (
        <div className="space-y-3">
          <div>
            <span className="text-xs text-muted">Validator</span>
            <div className="mt-1 rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-secondary font-mono" style={{ borderColor: "var(--border-default)" }}>
              price_validator.spend
            </div>
          </div>
          <div>
            <span className="text-xs text-muted">Plutus Version</span>
            <div className="mt-1 rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-secondary" style={{ borderColor: "var(--border-default)" }}>
              PlutusV3
            </div>
          </div>
          <div className="text-[10px] text-muted italic">
            Validator parameters are determined by the compiled Aiken contract
          </div>
        </div>
      );
  }
}

function VisualTab({ config, onChange }: {
  config: NodeConfig;
  onChange: (patch: Partial<NodeConfig>) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs text-muted">Custom Label</span>
        <input
          type="text"
          value={config.customLabel ?? ""}
          placeholder="Use default name"
          onChange={(e) => onChange({ customLabel: e.target.value || undefined })}
          className="mt-1 w-full rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-foreground"
          style={{ borderColor: "var(--border-default)" }}
        />
      </label>

      <label className="block">
        <span className="text-xs text-muted">Notes</span>
        <textarea
          value={config.notes ?? ""}
          placeholder="Add notes about this node…"
          onChange={(e) => onChange({ notes: e.target.value || undefined })}
          rows={3}
          className="mt-1 w-full rounded border bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-foreground resize-y"
          style={{ borderColor: "var(--border-default)" }}
        />
      </label>
    </div>
  );
}

export default function NodeConfigModal() {
  const configModalNodeId = usePipelineStore((s) => s.configModalNodeId);
  const closeConfigModal = usePipelineStore((s) => s.closeConfigModal);
  const nodeConfigs = usePipelineStore((s) => s.nodeConfigs);
  const updateNodeConfig = usePipelineStore((s) => s.updateNodeConfig);
  const [tab, setTab] = useState<Tab>("parameters");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConfigModal();
    },
    [closeConfigModal]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!configModalNodeId) return null;

  const nodeId = configModalNodeId;
  const config = nodeConfigs[nodeId] ?? {};
  const layer = NODE_LAYER[nodeId];
  const layerColors = NODE_ACCENT_OVERRIDE[nodeId] ?? LAYER_COLORS[layer];
  const label = config.customLabel || NODE_LABELS[nodeId];

  const handleChange = (patch: Partial<NodeConfig>) => {
    updateNodeConfig(nodeId, patch);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={closeConfigModal}
      />

      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] max-h-[80vh] rounded-xl border-2 overflow-hidden flex flex-col"
        style={{
          backgroundColor: "var(--bg-surface)",
          borderColor: layerColors.primary,
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{
            borderColor: "var(--border-default)",
            backgroundColor: `${layerColors.primary}0d`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
              style={{
                backgroundColor: `${layerColors.primary}20`,
                color: layerColors.primary,
              }}
            >
              {layer}
            </span>
          </div>
          <button
            onClick={closeConfigModal}
            className="text-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b" style={{ borderColor: "var(--border-default)" }}>
          {(["parameters", "visual"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                tab === t
                  ? "text-foreground border-b-2"
                  : "text-muted hover:text-secondary"
              }`}
              style={
                tab === t
                  ? { borderBottomColor: layerColors.primary }
                  : undefined
              }
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === "parameters" ? (
            <ParametersTab nodeId={nodeId} config={config} onChange={handleChange} />
          ) : (
            <VisualTab config={config} onChange={handleChange} />
          )}
        </div>
      </div>
    </>
  );
}
