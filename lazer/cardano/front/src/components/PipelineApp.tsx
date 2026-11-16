"use client";

import { useState, useEffect, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Play, Loader2 } from "lucide-react";
import StatusBar from "./StatusBar";
import PipelineGraph from "./PipelineGraph";
import ControlsPanel from "./panels/ControlsPanel";
import WalletPanel from "./panels/WalletPanel";
import InspectorPanel from "./panels/InspectorPanel";
import TxViewerPanel from "./panels/TxViewerPanel";
import DatumPanel from "./panels/DatumPanel";
import ExecutionLog from "./panels/ExecutionLog";
import NodeConfigModal from "./NodeConfigModal";
import { usePipelineStore } from "@/store/usePipelineStore";

type RightTab = "inspector" | "tx-viewer";

function RunFab() {
  const runAll = usePipelineStore((s) => s.runAll);
  const isRunning = usePipelineStore((s) =>
    Object.values(s.nodeStates).some((ns) => ns.state === "running")
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
      <button
        onClick={runAll}
        disabled={isRunning}
        title="Run All (⌘ Enter)"
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: "var(--accent-green)",
          boxShadow: "0 0 24px rgba(72, 199, 142, 0.4)",
        }}
      >
        {isRunning ? (
          <Loader2 className="h-5 w-5 animate-spin text-black" />
        ) : (
          <Play className="h-6 w-6 translate-x-0.5 fill-black text-black" />
        )}
      </button>
    </div>
  );
}

export default function PipelineApp() {
  const [rightTab, setRightTab] = useState<RightTab>("inspector");
  const runAll = usePipelineStore((s) => s.runAll);
  const selectNode = usePipelineStore((s) => s.selectNode);
  const closeConfigModal = usePipelineStore((s) => s.closeConfigModal);
  const configModalNodeId = usePipelineStore((s) => s.configModalNodeId);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runAll();
      }
      if (e.key === "Escape") {
        if (configModalNodeId) {
          closeConfigModal();
        } else {
          selectNode(null);
        }
      }
    },
    [runAll, selectNode, closeConfigModal, configModalNodeId]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen flex-col" style={{ minWidth: 1024 }}>
      {/* Status Bar */}
      <StatusBar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className="flex w-[260px] shrink-0 flex-col overflow-y-auto border-r p-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-default)",
          }}
        >
          <ControlsPanel />
          <WalletPanel />
        </aside>

        {/* Center + Bottom */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Graph */}
          <div className="relative flex-1 overflow-hidden">
            <ReactFlowProvider>
              <PipelineGraph />
            </ReactFlowProvider>

            {/* Floating Run button */}
            <RunFab />
          </div>

          {/* Execution Log */}
          <div
            className="h-[180px] shrink-0 border-t"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border-default)",
            }}
          >
            <ExecutionLog />
          </div>
        </div>

        {/* Right Sidebar */}
        <aside
          className="flex w-[320px] shrink-0 flex-col border-l overflow-hidden"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-default)",
          }}
        >
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "var(--border-default)" }}>
            <button
              onClick={() => setRightTab("inspector")}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                rightTab === "inspector"
                  ? "text-foreground border-b-2"
                  : "text-muted hover:text-secondary"
              }`}
              style={
                rightTab === "inspector"
                  ? { borderBottomColor: "var(--accent-blue)" }
                  : undefined
              }
            >
              Inspector
            </button>
            <button
              onClick={() => setRightTab("tx-viewer")}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                rightTab === "tx-viewer"
                  ? "text-foreground border-b-2"
                  : "text-muted hover:text-secondary"
              }`}
              style={
                rightTab === "tx-viewer"
                  ? { borderBottomColor: "var(--accent-blue)" }
                  : undefined
              }
            >
              TX Viewer
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {rightTab === "inspector" ? <InspectorPanel /> : <TxViewerPanel />}
          </div>

          {/* Datum panel */}
          <div className="shrink-0 overflow-y-auto p-4 max-h-[250px]">
            <DatumPanel />
          </div>
        </aside>
      </div>
      {/* Config Modal */}
      <NodeConfigModal />
    </div>
  );
}
