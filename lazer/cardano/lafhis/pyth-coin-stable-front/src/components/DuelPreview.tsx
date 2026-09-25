import { HermesClient } from "@pythnetwork/hermes-client";
import { useEffect, useRef, useState } from "react";
import type { GameDuration } from "@/types/game";

// ─── Confetti ────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#a78bfa", "#818cf8", "#34d399", "#f472b6",
  "#fbbf24", "#60a5fa", "#f87171", "#c084fc",
];

type Particle = {
  id: number; x: number; delay: number; duration: number;
  color: string; size: number; drift: number; shape: "rect" | "circle";
};

function makeParticles(n: number): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 2.2 + Math.random() * 1.6,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
    size: 5 + Math.random() * 6,
    drift: (Math.random() - 0.5) * 60,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  }));
}

function Confetti() {
  const [particles] = useState(() => makeParticles(60));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.shape === "circle" ? p.size : p.size * 1.6,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            backgroundColor: p.color,
            opacity: 0,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-10px) translateX(0) rotate(0deg);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(320px) translateX(var(--drift)) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

type RaceState = "idle" | "running" | "finished";

const DURATION_SECONDS: Record<GameDuration, number> = {
  "1m": 60,
  "5m": 300,
  "1h": 3600,
};

async function fetchLatestPrices(
  client: HermesClient,
  ids: Record<string, string>,
): Promise<Record<string, number> | null> {
  try {
    const updates = await client.getLatestPriceUpdates(Object.values(ids));
    const parsed = updates.parsed ?? [];
    const result: Record<string, number> = {};
    for (const feed of parsed) {
      const entry = Object.entries(ids).find(([, id]) => id === feed.id);
      if (entry) result[entry[0]] = Number(feed.price.price) * Math.pow(10, feed.price.expo);
    }
    return result;
  } catch {
    return null;
  }
}

function Bar({ pct, scaleMax, color }: { pct: number; scaleMax: number; color: "violet" | "cyan" }) {
  const negative = pct < 0;
  const halfFill = Math.min((Math.abs(pct) / scaleMax) * 50, 50);
  const bg = negative
    ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
    : color === "violet"
      ? "bg-violet-500 shadow-[0_0_6px_rgba(124,58,237,0.7)]"
      : "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.7)]";

  return (
    <div className="relative h-1.5 w-full rounded-full bg-slate-800">
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-500" />
      <div
        className={`absolute inset-y-0 rounded-full transition-all duration-500 ${bg}`}
        style={negative ? { right: "50%", width: `${halfFill}%` } : { left: "50%", width: `${halfFill}%` }}
      />
    </div>
  );
}

function Lane({
  sym, color, currentPrice, pctChange, scaleMax, leading, winner, raceState,
}: {
  sym: string; color: "violet" | "cyan"; currentPrice: number | null;
  pctChange: number | null; scaleMax: number; leading: boolean;
  winner: boolean; raceState: RaceState;
}) {
  const text = color === "violet" ? "text-violet-300" : "text-cyan-300";
  const border = color === "violet" ? "border-violet-500/30" : "border-cyan-500/25";
  const negative = pctChange !== null && pctChange < 0;
  const pctColor = negative ? "text-red-400" : "text-emerald-400";

  return (
    <div className="relative">
      {winner && (
        <>
          <img
            src="/img/horseshoe.png"
            alt="trophy"
            className="pointer-events-none absolute -top-16 left-1/2 z-10 h-16 w-16 -translate-x-1/2 object-contain drop-shadow-[0_0_16px_rgba(251,191,36,0.9)]"
            style={{ animation: "trophy-float 1.8s ease-in-out infinite" }}
          />
          <style>{`
            @keyframes trophy-float {
              0%, 100% { transform: translateX(-50%) translateY(0px);   }
              50%       { transform: translateX(-50%) translateY(-6px);  }
            }
          `}</style>
        </>
      )}
    <div className={`rounded-xl border ${border} ${winner ? "ring-2 ring-yellow-400/60 shadow-[0_0_14px_rgba(251,191,36,0.25)]" : ""} bg-slate-950/50 p-3 transition-all duration-300`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`text-[11px] font-bold ${text}`}>{sym}</span>
        <div className="flex items-center gap-1.5">
          {winner && (
            <span className="rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-yellow-300">🏆 winner</span>
          )}
          {leading && !winner && (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">leading</span>
          )}
          {raceState === "idle" && currentPrice !== null && (
            <span className="text-[11px] font-bold tabular-nums text-slate-300">
              ${currentPrice < 10 ? currentPrice.toFixed(4) : currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {raceState !== "idle" && pctChange !== null && (
            <span className={`text-[13px] font-bold tabular-nums ${pctColor}`}>
              {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(3)}%
            </span>
          )}
          {raceState !== "idle" && pctChange === null && (
            <span className="animate-pulse text-[10px] text-slate-500">loading…</span>
          )}
        </div>
      </div>
      {raceState !== "idle" && (
        <>
          <Bar pct={pctChange ?? 0} scaleMax={scaleMax} color={color} />
          <div className="mt-0.5 flex justify-between text-[8px] text-slate-600">
            <span>-{scaleMax.toFixed(2)}%</span>
            <span>0</span>
            <span>+{scaleMax.toFixed(2)}%</span>
          </div>
        </>
      )}
    </div>
    </div>
  );
}

type DuelPreviewProps = {
  symA?: string;
  symB?: string;
  autoStart?: boolean;
  duration?: GameDuration;
};

export default function DuelPreview({
  symA = "ADA/USD",
  symB = "BTC/USD",
  autoStart = false,
  duration = "1m",
}: DuelPreviewProps) {
  const raceSecs = DURATION_SECONDS[duration];

  const [raceState, setRaceState] = useState<RaceState>("idle");
  const [seconds, setSeconds] = useState(raceSecs);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [startPrices, setStartPrices] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const clientRef = useRef<HermesClient | null>(null);
  const feedIdsRef = useRef<Record<string, string> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const client = new HermesClient("https://hermes.pyth.network", {});
    clientRef.current = client;
    const symbols = [symA, symB];

    void (async () => {
      try {
        const allFeeds = await client.getPriceFeeds({ assetType: "crypto" });
        const ids: Record<string, string> = {};
        for (const feed of allFeeds) {
          const sym = (feed.attributes.display_symbol ?? "").toUpperCase();
          if (symbols.includes(sym)) ids[sym] = feed.id;
        }
        if (!ids[symA] || !ids[symB]) return;
        feedIdsRef.current = ids;

        const prices = await fetchLatestPrices(client, ids);
        if (prices) setCurrentPrices(prices);
        setReady(true);

        if (autoStart) void triggerStart(client, ids);
      } catch {
        setError("Could not connect to Pyth.");
      }
    })();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symA, symB, autoStart]);

  async function triggerStart(client: HermesClient, ids: Record<string, string>) {
    const prices = await fetchLatestPrices(client, ids);
    if (!prices) { setError("Failed to fetch prices. Try again."); return; }

    setStartPrices(prices);
    setCurrentPrices(prices);
    setSeconds(raceSecs);
    setRaceState("running");

    pollRef.current = setInterval(() => {
      void fetchLatestPrices(client, ids).then((p) => { if (p) setCurrentPrices(p); });
    }, 3000);

    let s = raceSecs;
    countdownRef.current = setInterval(() => {
      s -= 1;
      setSeconds(s);
      if (s <= 0) {
        clearInterval(countdownRef.current!);
        clearInterval(pollRef.current!);
        setRaceState("finished");
      }
    }, 1000);
  }

  async function startRace() {
    if (!clientRef.current || !feedIdsRef.current) return;
    setError(null);
    await triggerStart(clientRef.current, feedIdsRef.current);
  }

  function resetRace() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setRaceState("idle");
    setSeconds(raceSecs);
    setStartPrices({});
    if (clientRef.current && feedIdsRef.current) {
      void fetchLatestPrices(clientRef.current, feedIdsRef.current).then((p) => {
        if (p) setCurrentPrices(p);
      });
    }
  }

  function getPct(sym: string): number | null {
    const start = startPrices[sym];
    const cur = currentPrices[sym];
    if (!start || !cur) return null;
    return ((cur - start) / start) * 100;
  }

  const pctA = getPct(symA);
  const pctB = getPct(symB);
  const aLeading = pctA !== null && pctB !== null && pctA >= pctB;
  const winner =
    raceState === "finished" && pctA !== null && pctB !== null
      ? pctA >= pctB ? symA : symB
      : null;

  const scaleMax = Math.max(0.15, Math.abs(pctA ?? 0), Math.abs(pctB ?? 0));

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const isDemo = !autoStart;

  return (
    <div className="relative flex flex-col gap-3">
      {raceState === "finished" && <Confetti />}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-violet-100/40">
          {isDemo ? "Demo Duel" : "Live Race"}
        </p>
        <span className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider
          ${raceState === "running"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : raceState === "finished"
              ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
              : "border-slate-600/40 bg-slate-800/40 text-slate-400"}`}>
          {raceState === "running" ? "● live" : raceState === "finished" ? "finished" : ready ? "ready" : "loading…"}
        </span>
      </div>

      <div className={`flex flex-col gap-3 ${winner ? "pt-14" : ""} transition-all duration-500`}>
        <Lane sym={symA} color="violet" currentPrice={currentPrices[symA] ?? null}
          pctChange={pctA} scaleMax={scaleMax}
          leading={raceState === "running" && aLeading}
          winner={winner === symA} raceState={raceState} />

        <Lane sym={symB} color="cyan" currentPrice={currentPrices[symB] ?? null}
          pctChange={pctB} scaleMax={scaleMax}
          leading={raceState === "running" && !aLeading && pctB !== null}
          winner={winner === symB} raceState={raceState} />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-700/40 bg-slate-950/50 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <span className={`text-[12px] font-bold tabular-nums ${seconds <= 10 && raceState === "running" ? "animate-pulse text-red-400" : "text-slate-300"}`}>
            {mm}:{ss}
          </span>
        </div>

        {raceState === "idle" && !autoStart && (
          <button onClick={() => void startRace()} disabled={!ready}
            className="flex items-center gap-1.5 rounded-lg border border-violet-400/60 bg-violet-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-200 transition hover:bg-violet-500/30 disabled:cursor-wait disabled:opacity-40">
            <span>▶</span> Start Race
          </button>
        )}
        {raceState === "running" && (
          <span className="animate-pulse text-[9px] text-slate-500">Fetching live from Pyth…</span>
        )}
        {raceState === "finished" && !autoStart && (
          <button onClick={resetRace}
            className="rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-500/25">
            ↺ Race Again
          </button>
        )}
      </div>

      {error && <p className="text-[10px] text-red-400">{error}</p>}

      <p className="text-center text-[9px] text-violet-100/30">
        {raceState === "idle"
          ? "Live prices from Pyth · press Start to begin"
          : raceState === "running"
            ? "Highest % change at end of window wins the pot"
            : `${winner} wins this ${isDemo ? "demo round" : "race"}`}
      </p>
    </div>
  );
}
