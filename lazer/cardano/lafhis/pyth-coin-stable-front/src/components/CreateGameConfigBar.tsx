import { useMemo, useState } from "react";

const RATE_OPTIONS = ["ADA/USD", "BTC/USD", "ETH/USD", "BNB/USD"] as const;
const DURATION_OPTIONS = [
  { label: "1 minute", value: "1m" },
  { label: "5 minutes", value: "5m" },
  { label: "1 hour", value: "1h" },
] as const;

export type CreateGameConfigInput = {
  rate: (typeof RATE_OPTIONS)[number];
  betAda: number;
  duration: (typeof DURATION_OPTIONS)[number]["value"];
};

type CreateGameConfigBarProps = {
  creating?: boolean;
  error?: string | null;
  onCreate?: (config: CreateGameConfigInput) => void | Promise<void>;
};

export default function CreateGameConfigBar({
  creating = false,
  error = null,
  onCreate,
}: CreateGameConfigBarProps) {
  const [selectedRate, setSelectedRate] = useState<(typeof RATE_OPTIONS)[number]>("ADA/USD");
  const [selectedBet, setSelectedBet] = useState("10");
  const [selectedDuration, setSelectedDuration] = useState<(typeof DURATION_OPTIONS)[number]["value"]>(
    "1m",
  );

  const selectedDurationLabel = useMemo(
    () => DURATION_OPTIONS.find((option) => option.value === selectedDuration)?.label ?? selectedDuration,
    [selectedDuration],
  );
  const betAda = Number(selectedBet);
  const canCreate = Number.isFinite(betAda) && betAda >= 5 && !creating;

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-slate-900/70 p-4 md:p-6">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
        Create Game Setup
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-100/85">
            1. Rate
          </p>
          <select
            value={selectedRate}
            onChange={(e) => setSelectedRate(e.target.value as (typeof RATE_OPTIONS)[number])}
            className="w-full rounded-lg border border-violet-500/35 bg-slate-950/70 px-3 py-2 text-xs font-bold text-slate-100 outline-none transition focus:border-violet-400/75 focus:shadow-[0_0_16px_rgba(124,58,237,0.28)]"
          >
            {RATE_OPTIONS.map((rate) => (
              <option key={rate} value={rate}>
                {rate}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-100/85">
            2. Bet
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-violet-500/35 bg-slate-950/70 px-3 py-2">
            <input
              type="number"
              min="5"
              step="0.5"
              value={selectedBet}
              onChange={(e) => setSelectedBet(e.target.value)}
              placeholder="Min 5"
              className="bet-input-no-spinner w-full bg-transparent text-xs font-bold text-slate-100 outline-none"
            />
            <span className="text-xs font-bold text-violet-100/80">ADA</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-100/85">
            3. Duration
          </p>
          <select
            value={selectedDuration}
            onChange={(e) =>
              setSelectedDuration(e.target.value as (typeof DURATION_OPTIONS)[number]["value"])
            }
            className="w-full rounded-lg border border-violet-500/35 bg-slate-950/70 px-3 py-2 text-xs font-bold text-slate-100 outline-none transition focus:border-violet-400/75 focus:shadow-[0_0_16px_rgba(124,58,237,0.28)]"
          >
            {DURATION_OPTIONS.map((duration) => (
              <option key={duration.value} value={duration.value}>
                {duration.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-violet-500/20 bg-slate-950/65 px-4 py-3 text-xs text-violet-100/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>
            Current selection: <strong>{selectedRate}</strong> | <strong>{selectedBet || "0"} ADA</strong> |{" "}
            <strong>{selectedDurationLabel}</strong>
          </p>
          <button
            type="button"
            disabled={!canCreate}
            onClick={() => {
              if (!canCreate || !onCreate) return;
              void onCreate({
                rate: selectedRate,
                betAda,
                duration: selectedDuration,
              });
            }}
            className="rounded-lg border border-violet-400/60 bg-violet-400/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-100 transition hover:border-violet-300/80 hover:bg-violet-400/22 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Game"}
          </button>
        </div>
        {error && <p className="mt-3 text-[11px] text-red-400">{error}</p>}
      </div>
    </section>
  );
}
