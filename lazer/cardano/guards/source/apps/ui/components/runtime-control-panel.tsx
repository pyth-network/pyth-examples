"use client";

import { useEffect, useState } from "react";
import { Layers3, Wallet } from "lucide-react";
import { mockDatasetOptions, type MockDatasetId } from "@/lib/mock-backtest";
import {
  detectWalletAvailability,
  createMockWalletSession,
  shortWalletAddress,
  type WalletSession,
} from "@/lib/wallet-session";

export type DashboardMode = "mock" | "preprod_snapshot";

interface RuntimeControlPanelProps {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  dataset: MockDatasetId;
  setDataset: (dataset: MockDatasetId) => void;
  walletSession: WalletSession | null;
  setWalletSession: (session: WalletSession | null) => void;
}

export function RuntimeControlPanel({
  mode,
  setMode,
  dataset,
  setDataset,
  walletSession,
  setWalletSession,
}: RuntimeControlPanelProps) {
  const [cardanoDetected, setCardanoDetected] = useState(false);
  const [svmDetected, setSvmDetected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const availability = detectWalletAvailability();
    setCardanoDetected(availability.cardano);
    setSvmDetected(availability.svm);
  }, []);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text">Runtime Control</h3>
            <p className="mt-1 text-xs text-text-muted">
              Toggle between mock replay and the current preprod dashboard snapshot.
              Use mock wallet sessions now; real CIP-30 and SVM wallet adapters are next.
            </p>
          </div>
          <span className="chip-accent">Demo-first</span>
        </div>
      </div>
      <div className="grid gap-5 p-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <Layers3 className="h-4 w-4 text-accent" />
            Mode
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("mock")}
              className={`rounded-2xl border p-4 text-left transition ${
                mode === "mock"
                  ? "border-accent bg-accent/8"
                  : "border-line bg-bg-soft hover:border-accent/25"
              }`}
            >
              <p className="text-sm font-semibold text-text">Mock replay</p>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                7d history at 15-minute intervals. Run strategies, inspect executions, and debug edge cases.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode("preprod_snapshot")}
              className={`rounded-2xl border p-4 text-left transition ${
                mode === "preprod_snapshot"
                  ? "border-accent bg-accent/8"
                  : "border-line bg-bg-soft hover:border-accent/25"
              }`}
            >
              <p className="text-sm font-semibold text-text">Preprod snapshot</p>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                Use the current preprod-oriented operator view and policy labs without the historical backtest loop.
              </p>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <Layers3 className="h-4 w-4 text-accent" />
            Dataset
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {mockDatasetOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDataset(option.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  dataset === option.id
                    ? "border-accent bg-accent/8"
                    : "border-line bg-bg-soft hover:border-accent/25"
                }`}
              >
                <p className="text-sm font-semibold text-text">{option.label}</p>
                <p className="mt-2 text-xs leading-relaxed text-text-muted">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <Wallet className="h-4 w-4 text-accent" />
            Wallet connect
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setWalletSession(createMockWalletSession("cardano"))}
              className="rounded-2xl border border-line bg-bg-soft p-4 text-left transition hover:border-accent/25"
            >
              <p className="text-sm font-semibold text-text">Mock Cardano</p>
              <p className="mt-2 text-xs text-text-muted">Instant demo session for CIP-30 style flows and preprod bootstrap.</p>
            </button>
            <button
              type="button"
              onClick={() => setWalletSession(createMockWalletSession("svm"))}
              className="rounded-2xl border border-line bg-bg-soft p-4 text-left transition hover:border-accent/25"
            >
              <p className="text-sm font-semibold text-text">Mock SVM</p>
              <p className="mt-2 text-xs text-text-muted">Lets the team demo the multichain control plane while SVM wallet adapters are wired.</p>
            </button>
            <div className="rounded-2xl border border-line bg-bg-soft p-4 text-left">
              <p className="text-sm font-semibold text-text">Real connectors</p>
              <div className="mt-2 space-y-1 text-xs text-text-muted">
                <p>CIP-30 detected: {cardanoDetected ? "yes" : "no"}</p>
                <p>SVM provider detected: {svmDetected ? "yes" : "no"}</p>
                <p>Top-right connect uses real providers when available, then falls back to mock.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-bg-soft px-4 py-3 text-sm text-text-secondary">
            <span className="chip">{walletSession ? walletSession.label : "No wallet connected"}</span>
            {walletSession && (
              <>
                <span className="font-mono text-xs text-text">{shortWalletAddress(walletSession.address)}</span>
                <button
                  type="button"
                  onClick={() => setWalletSession(null)}
                  className="btn-ghost !px-2 !py-1"
                >
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
