"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { runtimeAvailability } from "@/lib/runtime";

const STORAGE_KEY = "guards-preprod-warning-dismissed";

export function PreprodWarningModal() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (
      runtimeAvailability.mainnetAvailable ||
      runtimeAvailability.cardanoNetworkId !== "preprod"
    ) {
      setOpen(false);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const dismissed = window.sessionStorage.getItem(STORAGE_KEY);
    setOpen(dismissed !== "true");
  }, []);

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-6 backdrop-blur-md"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preprod-warning-title"
        aria-describedby="preprod-warning-description"
        tabIndex={-1}
        className="glass-panel max-w-xl border border-[rgba(240,191,95,0.22)] bg-[linear-gradient(135deg,rgba(26,19,12,0.94),rgba(15,14,28,0.96))] p-6 shadow-2xl shadow-black/50"
      >
        <div className="flex items-start gap-4">
          <div className="mt-1 rounded-full bg-[rgba(240,191,95,0.14)] p-2 text-[#f0bf5f]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="chip-yellow">Cardano preprod only</div>
              <h2
                id="preprod-warning-title"
                className="text-xl font-semibold text-text"
              >
                {runtimeAvailability.warningTitle}
              </h2>
              <p
                id="preprod-warning-description"
                className="text-sm leading-relaxed text-text-secondary"
              >
                {runtimeAvailability.warningBody}
              </p>
            </div>
            <div className="grid gap-2 text-sm text-text-secondary">
              <p>
                <strong className="text-text">What works now:</strong> live Pyth signed
                updates, DexHunter adapter wiring, browser policy labs, and demo-first wallet connectivity.
              </p>
              <p>
                <strong className="text-text">What does not work yet:</strong> mainnet
                execution, on-chain vault creation, and a deployable validator path for the hot bucket.
              </p>
              <p>
                <strong className="text-text">Next for preprod:</strong> deploy the
                `PolicyVault` validator, resolve the Pyth state UTxO from a provider,
                and fund governance plus hot-wallet rails.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  window.sessionStorage.setItem(STORAGE_KEY, "true");
                  setOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#070612] transition hover:bg-white/90"
              >
                Continue in preprod
              </button>
              <span className="inline-flex items-center gap-2 text-xs text-text-muted">
                <AlertTriangle className="h-3.5 w-3.5 text-[#f0bf5f]" />
                Mainnet unavailable
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PreprodWarningBanner() {
  if (
    runtimeAvailability.mainnetAvailable ||
    runtimeAvailability.cardanoNetworkId !== "preprod"
  ) {
    return null;
  }

  return (
    <div className="glass-panel border border-[rgba(240,191,95,0.18)] bg-[linear-gradient(135deg,rgba(26,19,12,0.9),rgba(12,11,24,0.94))] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="chip-yellow">{runtimeAvailability.cardanoNetworkLabel}</div>
          <p className="text-sm font-medium text-text">
            Guards is currently restricted to Cardano preprod.
          </p>
          <p className="text-sm text-text-secondary">
            Mainnet execution is disabled. Vault bootstrap still requires deployed
            Aiken scripts, funded governance/hot wallets, and provider-backed Pyth
            state resolution.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-text-muted">
          <span className="chip">No mainnet</span>
          <span className="chip">Wallet connect beta</span>
          <span className="chip">Browser policy lab</span>
        </div>
      </div>
    </div>
  );
}
