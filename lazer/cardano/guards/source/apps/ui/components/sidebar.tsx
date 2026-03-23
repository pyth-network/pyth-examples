"use client";

import { getStageAppearance } from "@/lib/stage";
import { runtimeAvailability } from "@/lib/runtime";
import type { ChainId, RiskStage } from "@/lib/types";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { DashboardMode } from "@/components/runtime-control-panel";

const navItems = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="5.5" height="5.5" rx="1.5" />
        <rect x="10.5" y="2" width="5.5" height="5.5" rx="1.5" />
        <rect x="2" y="10.5" width="5.5" height="5.5" rx="1.5" />
        <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h12M3 10h12M3 14h8" />
      </svg>
    ),
  },
  {
    id: "policy",
    label: "Policy",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2L15 5v4.5c0 3.5-2.5 6.5-6 7.5-3.5-1-6-4-6-7.5V5l6-3z" />
      </svg>
    ),
  },
  {
    id: "runtime",
    label: "Runtime",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h10" />
        <path d="M6 9h6" />
        <path d="M8 14h2" />
        <circle cx="12.5" cy="4" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="5.5" cy="9" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="10.5" cy="14" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "risk",
    label: "Risk Ladder",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15l4-4 3 3 5-6" />
        <path d="M12 8h4v4" />
      </svg>
    ),
  },
  {
    id: "execution",
    label: "Execution",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="9" r="7" />
        <path d="M7.5 6l4 3-4 3V6z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "swap",
    label: "Swap",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h10M11 4l3 3-3 3" />
        <path d="M14 11H4M7 14l-3-3 3-3" />
      </svg>
    ),
  },
  {
    id: "audit",
    label: "Audit Log",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
        <path d="M6 7h6M6 10h6M6 13h3" />
      </svg>
    ),
  },
];

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  vaultName: string;
  chain: ChainId;
  stage: RiskStage;
  mode: DashboardMode;
  datasetLabel?: string;
}

export function Sidebar({
  activeSection,
  onNavigate,
  vaultName,
  chain,
  stage,
  mode,
  datasetLabel,
}: SidebarProps) {
  const stageAppearance = getStageAppearance(stage);
  const resolvedVaultName =
    mode === "mock" ? `Demo · ${datasetLabel ?? "Mock dataset"}` : vaultName;
  const resolvedMeta =
    mode === "mock"
      ? "interactive replay · strategy sandbox"
      : `${chain} · ${stageAppearance.label}`;

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass-sidebar w-[280px] min-h-screen flex flex-col py-7 px-4 gap-6 fixed left-0 top-0 z-40"
    >
      {/* Brand */}
      <div className="flex items-center justify-between px-3 mb-1">
        <div className="flex items-center">
          <img
            src="/guards-logo.png"
            alt="Guards"
            width={162}
            height={36}
            decoding="async"
            className="h-9 w-auto"
          />
        </div>
        <a href="/" title="Back to landing" aria-label="Back to landing">
          <ArrowLeft className="w-4 h-4 text-text-muted hover:text-text transition-colors cursor-pointer" />
        </a>
      </div>

      {/* Vault Card */}
      <div className="glass-panel p-4 space-y-3 relative overflow-hidden">
        {/* Subtle glow */}
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: stageAppearance.chartColor }}
        />
        <div className="relative flex items-center justify-between">
          <span className="eyebrow">Active Vault</span>
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full opacity-40"
              style={{ background: stageAppearance.chartColor }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ background: stageAppearance.chartColor }}
            />
          </span>
        </div>
        <div className="relative">
          <p className="text-sm font-semibold text-text">{resolvedVaultName}</p>
          <p className="text-xs text-text-muted font-mono mt-0.5 capitalize">
            {mode === "mock" ? (
              resolvedMeta
            ) : (
              <>
                {chain} &middot;{" "}
                <span className={stageAppearance.textClass}>{stageAppearance.label}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.04, duration: 0.3 }}
            onClick={() => onNavigate(item.id)}
            className={`nav-item ${activeSection === item.id ? "active" : ""}`}
          >
            {item.icon}
            {item.label}
          </motion.button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-green opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
          </span>
          <span className="font-mono">{runtimeAvailability.cardanoNetworkLabel} only</span>
        </div>
        <p className="text-[0.58rem] text-text-muted/60 font-mono">
          guards.one v0.2.0 · {runtimeAvailability.mainnetAvailable ? "mainnet enabled" : "mainnet disabled"}
        </p>
      </div>
    </motion.aside>
  );
}
