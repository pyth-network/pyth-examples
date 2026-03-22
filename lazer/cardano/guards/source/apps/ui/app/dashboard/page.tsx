"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MetricCard } from "@/components/metric-card";
import { AccountsTable } from "@/components/accounts-table";
import { RiskLadder } from "@/components/risk-ladder";
import { PolicyCards } from "@/components/policy-cards";
import { ExecutionTimeline } from "@/components/execution-timeline";
import { VaultProfilePanel } from "@/components/vault-profile-panel";
import { SwapPanel } from "@/components/swap-panel";
import { SimulationReplay } from "@/components/simulation-replay";
import { AuditLog } from "@/components/audit-log";
import {
  PreprodWarningBanner,
  PreprodWarningModal,
} from "@/components/preprod-warning";
import { VaultBootstrapLab } from "@/components/vault-bootstrap-lab";
import { ScenarioLab } from "@/components/scenario-lab";
import { HistoricalStrategyLab } from "@/components/historical-strategy-lab";
import {
  RuntimeControlPanel,
  type DashboardMode,
} from "@/components/runtime-control-panel";
import type { RiskLadderStep } from "@/lib/types";
import { demoState } from "@/lib/demo-data";
import {
  connectPreferredWallet,
  type WalletSession,
} from "@/lib/wallet-session";
import {
  mockDatasetOptions,
  type MockDatasetId,
} from "@/lib/mock-backtest";
import {
  buildBootstrapDraft,
  buildPolicyViewFromDraft,
} from "@/lib/vault-lab";

const sectionTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [mode, setMode] = useState<DashboardMode>("mock");
  const [dataset, setDataset] = useState<MockDatasetId>("ada_treasury_base");
  const [walletSession, setWalletSession] = useState<WalletSession | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [bootstrapDraft, setBootstrapDraft] = useState(() =>
    buildBootstrapDraft(demoState.policy),
  );

  const data = demoState;
  const policyView = buildPolicyViewFromDraft(bootstrapDraft);
  const datasetLabel =
    mockDatasetOptions.find((option) => option.id === dataset)?.label ?? dataset;
  const stablePosition = data.positions.find((p) => p.role === "stable");
  const riskPosition = data.positions.find((p) => p.role === "risk");
  const ladderStep: RiskLadderStep = data.vault.ladderStep ?? data.vault.stage;

  async function handleConnectWallet() {
    if (connectingWallet) {
      return;
    }

    if (data.vault.chain === "evm") {
      if (typeof window !== "undefined") {
        window.alert(
          "EVM wallet connect is not enabled in this UI yet. Use Cardano or SVM mode for the current demo.",
        );
      }
      return;
    }

    setConnectingWallet(true);
    try {
      const chain = data.vault.chain === "svm" ? "svm" : "cardano";
      const session = await connectPreferredWallet(chain);
      setWalletSession(session);
    } finally {
      setConnectingWallet(false);
    }
  }

  return (
    <div className="min-h-screen flex relative">
      <PreprodWarningModal />
      {/* Ambient background gradient */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(124,111,247,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.03) 0%, transparent 50%)",
        }}
      />

      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        vaultName={bootstrapDraft.vaultName}
        chain={data.vault.chain}
        stage={data.vault.stage}
        mode={mode}
        datasetLabel={datasetLabel}
      />

      <main className="relative z-10 flex-1 ml-[280px] px-10 py-7 max-w-[1200px]">
        <Topbar
          stage={data.vault.stage}
          chain={data.vault.chain}
          oracleFreshness={data.metrics.oracleFreshness}
          mode={mode}
          walletSession={walletSession}
          companyName={bootstrapDraft.companyName}
          vaultName={bootstrapDraft.vaultName}
          connectingWallet={connectingWallet}
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={() => setWalletSession(null)}
        />
        <div className="mb-6">
          <PreprodWarningBanner />
        </div>
        <div className="mb-6">
          <RuntimeControlPanel
            mode={mode}
            setMode={setMode}
            dataset={dataset}
            setDataset={setDataset}
            walletSession={walletSession}
            setWalletSession={setWalletSession}
          />
        </div>

        <AnimatePresence mode="wait">
          {/* Overview */}
          {(activeSection === "overview" || activeSection === "accounts") && (
            <motion.section key={activeSection} {...sectionTransition} className="space-y-6 mb-8">
              {activeSection === "overview" && (
                <>
                  {/* Hero Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                      label="Liquid Value"
                      value={`$${data.metrics.liquidValue.toLocaleString()}`}
                      sub="After haircut"
                      accent="blue"
                    />
                    <MetricCard
                      label="Stable Ratio"
                      value={`${(data.metrics.stableRatio * 100).toFixed(0)}%`}
                      sub={`${stablePosition?.symbol ?? "Stable"} allocation`}
                      accent="green"
                    />
                    <MetricCard
                      label="Drawdown"
                      value={`${data.metrics.drawdownBps} bps`}
                      sub="vs EMA price"
                      accent={
                        data.metrics.drawdownBps > 700
                          ? "red"
                          : data.metrics.drawdownBps > 300
                          ? "yellow"
                          : "default"
                      }
                    />
                    <MetricCard
                      label="Oracle"
                      value={data.metrics.oracleFreshness}
                      sub={
                        data.oracle.publisherCount != null
                          ? `${data.oracle.publisherCount} publishers`
                          : "— publishers"
                      }
                      accent="green"
                    />
                  </div>

                  {/* Oracle Details */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                    className="glass-panel p-6 relative overflow-hidden"
                  >
                    <div
                      className="absolute -top-20 -left-20 w-60 h-60 rounded-full opacity-10 blur-3xl pointer-events-none"
                      style={{ background: "#7c6ff7" }}
                    />
                    <div className="relative flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-sm font-semibold text-text">
                          Oracle Feed
                        </h3>
                        <p className="text-xs text-text-muted mt-0.5 font-mono">
                          {data.oracle.feedId}
                        </p>
                      </div>
                      <span className="chip-green">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-green opacity-50" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green" />
                        </span>
                        Live
                      </span>
                    </div>
                    <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { label: "Spot Price", value: `$${data.oracle.price.toFixed(4)}` },
                        { label: "EMA Price", value: `$${data.oracle.emaPrice.toFixed(4)}` },
                        { label: "Confidence", value: `±$${data.oracle.confidence.toFixed(4)}` },
                        { label: "Symbol", value: data.oracle.symbol, accent: true },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="eyebrow">{item.label}</p>
                          <p
                            className={`text-lg font-bold font-mono mt-1.5 ${
                              item.accent ? "text-accent" : "text-text"
                            }`}
                          >
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}

              <AccountsTable positions={data.positions} />
            </motion.section>
          )}

          {/* Policy */}
          {activeSection === "policy" && (
            <motion.section key="policy" {...sectionTransition} className="space-y-6 mb-8">
              <VaultBootstrapLab
                draft={bootstrapDraft}
                setDraft={setBootstrapDraft}
                currentAdaPrice={data.oracle.price}
              />
              <PolicyCards policy={policyView} />
            </motion.section>
          )}

          {/* Risk Ladder */}
          {activeSection === "risk" && (
            <motion.section key="risk" {...sectionTransition} className="space-y-6 mb-8">
              {mode === "mock" ? (
                <HistoricalStrategyLab draft={bootstrapDraft} dataset={dataset} />
              ) : (
                <SimulationReplay frames={data.frames ?? []} />
              )}
              <ScenarioLab draft={bootstrapDraft} />
              <RiskLadder currentStage={data.vault.stage} activeStep={ladderStep} />
            </motion.section>
          )}

          {/* Execution */}
          {activeSection === "execution" && (
            <motion.section key="execution" {...sectionTransition} className="mb-8 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
              <ExecutionTimeline events={data.events} referenceNowMs={data.nowMs} />
              <VaultProfilePanel
                draft={bootstrapDraft}
                chain={data.vault.chain}
                walletSession={walletSession}
              />
            </motion.section>
          )}

          {/* Swap */}
          {activeSection === "swap" && (
            <motion.section key="swap" {...sectionTransition} className="mb-8 max-w-md">
              <SwapPanel
                riskSymbol={riskPosition?.symbol ?? "ADA"}
                stableSymbol={stablePosition?.symbol ?? "USDM"}
                currentPrice={data.oracle.price}
                oracleFreshness={data.metrics.oracleFreshness}
                haircutBps={policyView.haircutBps}
              />
            </motion.section>
          )}

          {/* Audit */}
          {activeSection === "audit" && (
            <motion.section key="audit" {...sectionTransition} className="space-y-6 mb-8">
              <AuditLog events={data.events} />
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
