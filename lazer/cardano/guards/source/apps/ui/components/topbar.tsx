"use client";

import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { getStageAppearance } from "@/lib/stage";
import { runtimeAvailability } from "@/lib/runtime";
import type { ChainId, RiskStage } from "@/lib/types";
import type { DashboardMode } from "@/components/runtime-control-panel";
import {
  shortWalletAddress,
  type WalletSession,
} from "@/lib/wallet-session";

interface TopbarProps {
  stage: RiskStage;
  chain: ChainId;
  oracleFreshness: string;
  mode: DashboardMode;
  liveQuotesEnabled: boolean;
  liveQuotesError: string | null;
  walletSession: WalletSession | null;
  companyName: string;
  vaultName: string;
  connectingWallet: boolean;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
}

function chainLabel(chain: ChainId): string {
  if (chain === "cardano") {
    return runtimeAvailability.cardanoNetworkLabel;
  }

  if (chain === "svm") {
    return "Solana / SVM";
  }

  return "Ethereum / EVM";
}

function connectLabel(chain: ChainId): string {
  if (chain === "cardano") {
    return "Connect Cardano Wallet";
  }

  if (chain === "svm") {
    return "Connect SVM Wallet";
  }

  return "Connect Wallet";
}

export function Topbar({
  stage,
  chain,
  oracleFreshness,
  mode,
  liveQuotesEnabled,
  liveQuotesError,
  walletSession,
  companyName,
  vaultName,
  connectingWallet,
  onConnectWallet,
  onDisconnectWallet,
}: TopbarProps) {
  const appearance = getStageAppearance(stage);
  const pythAccent = liveQuotesError
    ? "#f0bf5f"
    : liveQuotesEnabled
      ? "#22c55e"
      : "#9896aa";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mb-8 flex items-start justify-between gap-6 px-1 py-4"
    >
      <div className="space-y-3">
        <div>
          <p className="eyebrow">Company Profile</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-text">
            {companyName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {vaultName} · {chainLabel(chain)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={appearance.chipClass}>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: appearance.chartColor }}
            />
            {appearance.label}
          </span>
          <span
            className="chip"
            style={{ background: "rgba(124,111,247,0.08)", color: "#9896aa" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-50 motion-reduce:animate-none" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green" />
            </span>
            {chainLabel(chain)}
          </span>
          {!runtimeAvailability.mainnetAvailable && (
            <span
              className="chip"
              style={{ background: "rgba(240,191,95,0.12)", color: "#f0bf5f" }}
            >
              Mainnet unavailable
            </span>
          )}
          <span
            className="chip"
            style={{ background: "rgba(124,111,247,0.08)", color: "#9896aa" }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke={pythAccent}
              strokeWidth="1.5"
            >
              <circle cx="6" cy="6" r="5" />
              <path d="M6 3v3l2 1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Pyth: {liveQuotesEnabled ? oracleFreshness : "demo fallback"}
          </span>
          {liveQuotesError && (
            <span
              className="chip"
              style={{ background: "rgba(240,191,95,0.12)", color: "#f0bf5f" }}
              title={liveQuotesError}
            >
              Live quotes unavailable
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span
          className="chip"
          style={{ background: "rgba(124,111,247,0.08)", color: "#9896aa" }}
        >
          Mode: {mode === "mock" ? "Mock replay" : "Preprod snapshot"}
        </span>
        <span
          className="chip"
          style={{ background: "rgba(124,111,247,0.12)", color: "#7c6ff7" }}
        >
          Route: DexHunter
        </span>
        {walletSession ? (
          <>
            <span className="chip-green">
              <Wallet className="h-3.5 w-3.5" />
              {walletSession.label}
            </span>
            <span
              className="chip"
              style={{ background: "rgba(124,111,247,0.08)", color: "#9896aa" }}
            >
              {shortWalletAddress(walletSession.address)}
            </span>
            <button type="button" onClick={onDisconnectWallet} className="btn-ghost">
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onConnectWallet}
            disabled={connectingWallet}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Wallet className="h-4 w-4" />
            {connectingWallet ? "Connecting..." : connectLabel(chain)}
          </button>
        )}
      </div>
    </motion.div>
  );
}
