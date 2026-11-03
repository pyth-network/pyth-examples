import { ExecutionEvent } from "@/lib/types";

interface AuditLogProps {
  events: ExecutionEvent[];
}

function timeFormat(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function AuditLog({ events }: AuditLogProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h3 className="text-sm font-semibold text-text">Audit Log</h3>
        <p className="text-xs text-text-muted mt-1">
          Immutable execution record with oracle evidence
        </p>
      </div>
      <div className="divide-y divide-line-soft">
        {events.map((evt) => (
          <div key={evt.id} className="px-5 py-3 flex items-start gap-3 hover:bg-panel-hover transition-colors">
            <div className="mt-1">
              <span
                className={`status-dot ${
                  evt.status === "executed"
                    ? "bg-green"
                    : evt.status === "pending"
                    ? "bg-yellow"
                    : "bg-red"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text">
                <span className="font-semibold">
                  {evt.kind === "derisk_swap" ? "De-Risk" : "Re-Entry"}
                </span>{" "}
                — {evt.amount.toLocaleString()} {evt.sourceSymbol} → {evt.destinationSymbol}
              </p>
              <p className="text-[0.65rem] text-text-muted font-mono mt-0.5">
                Stage: {evt.stage} · Route: {evt.route} · {evt.id}
              </p>
            </div>
            <span className="text-[0.65rem] text-text-muted font-mono whitespace-nowrap">
              {timeFormat(evt.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
