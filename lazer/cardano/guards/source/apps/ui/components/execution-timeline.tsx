import { ExecutionEvent } from "@/lib/types";

interface ExecutionTimelineProps {
  events: ExecutionEvent[];
  referenceNowMs: number;
}

function statusChip(status: ExecutionEvent["status"]) {
  switch (status) {
    case "executed":
      return <span className="chip-green">Executed</span>;
    case "pending":
      return <span className="chip-yellow">Pending</span>;
    case "failed":
      return <span className="chip-red">Failed</span>;
  }
}

function kindLabel(kind: ExecutionEvent["kind"]) {
  return kind === "derisk_swap" ? "De-Risk Swap" : "Re-Entry Swap";
}

function timeAgo(timestamp: number, referenceNowMs: number) {
  const diff = referenceNowMs - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ExecutionTimeline({
  events,
  referenceNowMs,
}: ExecutionTimelineProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">
            Execution Timeline
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Recent swap executions and pending intents
          </p>
        </div>
        <span className="chip-blue">{events.length} events</span>
      </div>
      <div className="divide-y divide-line-soft">
        {events.map((evt) => (
          <div
            key={evt.id}
            className="px-5 py-4 flex items-center gap-4 hover:bg-panel-hover transition-colors"
          >
            {/* Icon */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                evt.kind === "derisk_swap"
                  ? "bg-red-muted"
                  : "bg-green-muted"
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke={evt.kind === "derisk_swap" ? "#ef6f6c" : "#22c55e"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {evt.kind === "derisk_swap" ? (
                  <>
                    <path d="M4 7h10M11 4l3 3-3 3" />
                    <path d="M14 11H4M7 14l-3-3 3-3" />
                  </>
                ) : (
                  <>
                    <path d="M14 11H4M7 14l-3-3 3-3" />
                    <path d="M4 7h10M11 4l3 3-3 3" />
                  </>
                )}
              </svg>
            </div>
            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text">
                  {kindLabel(evt.kind)}
                </span>
                {statusChip(evt.status)}
              </div>
              <p className="text-xs text-text-muted font-mono mt-1">
                {evt.amount.toLocaleString()} {evt.sourceSymbol} →{" "}
                {evt.destinationSymbol} via {evt.route}
              </p>
            </div>
            {/* Time */}
            <div className="text-right">
              <p className="text-xs text-text-muted font-mono">
                {timeAgo(evt.timestamp, referenceNowMs)}
              </p>
              <p className="text-[0.6rem] text-text-muted/60 font-mono mt-0.5">
                {evt.id}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
