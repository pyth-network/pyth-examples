import { useEffect, useState } from "react";
import type { GameRate } from "@/types/game";

const RATE_OPTIONS: GameRate[] = ["ADA/USD", "BTC/USD", "ETH/USD", "BNB/USD"];

export type JoinGameInput = {
  selectedRate: GameRate;
  gameInput: string;
};

type JoinGameConfigBarProps = {
  joining?: boolean;
  error?: string | null;
  initialGameInput?: string;
  gameInput?: string;
  onGameInputChange?: (value: string) => void;
  preview?: {
    opponentRate: GameRate;
    betAda: number;
    gameId: string;
  } | null;
  previewLoading?: boolean;
  previewError?: string | null;
  onJoin?: (input: JoinGameInput) => void | Promise<void>;
};

export default function JoinGameConfigBar({
  joining = false,
  error = null,
  initialGameInput = "",
  gameInput,
  onGameInputChange,
  preview = null,
  previewLoading = false,
  previewError = null,
  onJoin,
}: JoinGameConfigBarProps) {
  const [selectedRate, setSelectedRate] = useState<GameRate>("BTC/USD");
  const [localGameInput, setLocalGameInput] = useState(initialGameInput);
  const [origin, setOrigin] = useState("");
  const effectiveGameInput = gameInput ?? localGameInput;
  const canJoin = effectiveGameInput.trim().length > 0 && !joining;
  const exampleUrl = `${origin || "https://your-app"}/game/EXAMPLE123`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-slate-900/70 p-4 md:p-6">
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Join Game Setup</p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-100/85">
            1. Choose Asset
          </p>
          <select
            value={selectedRate}
            onChange={(e) => setSelectedRate(e.target.value as GameRate)}
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
            2. Game ID or Link
          </p>
          <input
            value={effectiveGameInput}
            onChange={(e) => {
              const value = e.target.value;
              if (onGameInputChange) {
                onGameInputChange(value);
                return;
              }
              setLocalGameInput(value);
            }}
            placeholder={`EXAMPLE123 or ${exampleUrl}`}
            className="w-full rounded-lg border border-violet-500/35 bg-slate-950/70 px-3 py-2 text-xs font-bold text-slate-100 outline-none transition focus:border-violet-400/75"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-violet-500/20 bg-slate-950/65 px-4 py-3 text-xs text-violet-100/80">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-violet-300">Game Preview</p>
        {previewLoading && <p>Loading game data...</p>}
        {!previewLoading && preview && (
          <p>
            Opponent asset: <strong>{preview.opponentRate}</strong> | Bet amount:{" "}
            <strong>{preview.betAda} ADA</strong> | Game ID: <strong>{preview.gameId}</strong>
          </p>
        )}
        {!previewLoading && !preview && !previewError && <p>Paste a game link or ID to load game details.</p>}
        {!previewLoading && previewError && <p className="text-red-400">{previewError}</p>}
      </div>

      <div className="mt-4 rounded-xl border border-violet-500/20 bg-slate-950/65 px-4 py-3 text-xs text-violet-100/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>
            Current selection: <strong>{selectedRate}</strong> |{" "}
            <strong>{effectiveGameInput.trim() || "No game id"}</strong>
          </p>
          <button
            type="button"
            disabled={!canJoin}
            onClick={() => {
              if (!canJoin || !onJoin) return;
              void onJoin({ selectedRate, gameInput: effectiveGameInput });
            }}
            className="rounded-lg border border-violet-400/60 bg-violet-400/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-100 transition hover:border-violet-300/80 hover:bg-violet-400/22 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {joining ? "Joining..." : "Join Game"}
          </button>
        </div>
        {error && <p className="mt-3 text-[11px] text-red-400">{error}</p>}
      </div>
    </section>
  );
}
