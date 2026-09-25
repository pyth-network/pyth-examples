"use client";

import { useEffect, useRef } from "react";
import { usePipelineStore } from "@/store/usePipelineStore";
import { NODE_LABELS } from "@/types/nodes";
import type { LogLevel } from "@/types/nodes";
import { Minus, Check, AlertTriangle, X, type LucideIcon } from "lucide-react";

const levelStyles: Record<LogLevel, { color: string; Icon: LucideIcon }> = {
  info:    { color: "var(--accent-cyan)",   Icon: Minus },
  success: { color: "var(--accent-green)",  Icon: Check },
  warn:    { color: "var(--accent-amber)",  Icon: AlertTriangle },
  error:   { color: "var(--accent-red)",    Icon: X },
};

export default function ExecutionLog() {
  const logs = usePipelineStore((s) => s.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-1.5" style={{ borderColor: "var(--border-default)" }}>
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Execution Log
        </h2>
        <span className="text-[10px] text-muted">
          {logs.length} entries
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[11px]">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted italic">
            No log entries yet
          </div>
        ) : (
          logs.map((entry) => {
            const style = levelStyles[entry.level];
            const time = new Date(entry.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            const { color, Icon } = levelStyles[entry.level];
            return (
              <div key={entry.id} className="flex items-start gap-2 py-0.5">
                <span className="shrink-0 text-muted">{time}</span>
                <Icon
                  className="mt-px shrink-0 h-3 w-3"
                  style={{ color }}
                />
                {entry.nodeId && (
                  <span className="shrink-0 rounded px-1 py-0 text-[9px] font-medium" style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)" }}>
                    {NODE_LABELS[entry.nodeId]?.toLowerCase() ?? entry.nodeId}
                  </span>
                )}
                <span style={{ color }}>{entry.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
