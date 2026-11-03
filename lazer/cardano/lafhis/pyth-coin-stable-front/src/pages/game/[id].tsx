import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@meshsdk/react";
import RequireWallet from "@/components/RequireWallet";
import DuelPreview from "@/components/DuelPreview";
import type { GameSession } from "@/types/game";

function shortWallet(wallet: string | null) {
  if (!wallet) return "Open slot";
  if (wallet.length <= 14) return wallet;
  return `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
}

function normalizeWallet(wallet: string) {
  return wallet.trim().toLowerCase();
}

export default function GameLobbyPage() {
  const router = useRouter();
  const { address } = useWallet();
  const [game, setGame] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveResult, setResolveResult] = useState<{ txHash?: string; error?: string } | null>(null);
  const id = useMemo(() => {
    const value = router.query.id;
    return typeof value === "string" ? value : "";
  }, [router.query.id]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    let active = true;

    async function loadGame() {
      try {
        const response = await fetch(`/api/games/${id}`);
        const data = (await response.json()) as { game?: GameSession; error?: string };

        if (!response.ok || !data.game) {
          throw new Error(data.error ?? "Could not load game");
        }

        if (!active) return;
        setGame(data.game);
        setError(null);
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Could not load game";
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadGame();
    const timer = setInterval(() => void loadGame(), 3000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);

  const shareLink = game ? `${origin}/game/${game.id}` : "";
  const normalizedAddress = address ? normalizeWallet(address) : "";
  const isPlayerOne = !!game && normalizedAddress === game.playerOneWallet;
  const isPlayerTwo = !!game && normalizedAddress === game.playerTwoWallet;
  const isParticipant = isPlayerOne || isPlayerTwo;
  const canJoin = !!game && !isParticipant && game.playerTwoWallet === null;

  async function copyText(text: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  }

  async function handleResolve() {
    if (!id) return;
    setResolving(true);
    setResolveResult(null);
    try {
      const res = await fetch("/api/onchain/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: id }),
      });
      const data = (await res.json()) as { txHash?: string; error?: string };
      setResolveResult(data);
    } catch (err) {
      setResolveResult({ error: err instanceof Error ? err.message : "Resolve failed" });
    } finally {
      setResolving(false);
    }
  }

  return (
    <>
      <Head>
        <title>Game Lobby</title>
      </Head>
      <main className="mx-auto min-h-[60vh] w-[92%] max-w-6xl py-10">
        <RequireWallet
          title="Connect Wallet To Enter Game"
          description="Connect your wallet to join this game lobby."
        >
          <section className="rounded-2xl border border-violet-500/25 bg-slate-900/70 p-5 md:p-7">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-lg text-slate-100 md:text-xl">Game Lobby {id ? `#${id}` : ""}</h1>
                {id && (
                  <button
                    type="button"
                    aria-label="Copy game ID"
                    title="Copy game ID"
                    onClick={() => void copyText(id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/35 bg-violet-400/10 text-violet-100/85 transition hover:border-violet-400/70 hover:text-slate-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => void router.push("/join-game")}
                className="w-fit rounded-lg border border-violet-500/35 bg-violet-400/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-100/85"
              >
                Join Another Game
              </button>
            </div>

            {loading && <p className="text-sm text-violet-100/75">Loading game...</p>}
            {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

            {game && (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-violet-500/20 bg-slate-950/65 p-4 text-xs text-violet-100/80">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-violet-300">
                      Players
                    </p>
                    <p>Player 1: {shortWallet(game.playerOneWallet)}</p>
                    <p className="mt-1">Player 2: {shortWallet(game.playerTwoWallet)}</p>
                  </div>

                  <div className="rounded-xl border border-violet-500/20 bg-slate-950/65 p-4 text-xs text-violet-100/80">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-violet-300">
                      Game Config
                    </p>
                    <p>Player 1 asset: {game.config.rate}</p>
                    <p className="mt-1">Player 2 asset: {game.playerTwoRate ?? "Pending"}</p>
                    <p className="mt-1">Bet: {game.config.betAda} ADA</p>
                    <p className="mt-1">Duration: {game.config.duration}</p>
                  </div>
                </div>

                {isPlayerOne && (
                  <div className="mt-4 rounded-xl border border-violet-500/20 bg-slate-950/65 p-4 text-xs text-violet-100/80">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-violet-300">
                      Invite Your Opponent
                    </p>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <button
                        type="button"
                        onClick={() => void copyText(game.id)}
                        className="rounded-lg border border-violet-500/35 bg-violet-400/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-100/85"
                      >
                        Copy Game ID
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyText(shareLink)}
                        className="rounded-lg border border-violet-500/35 bg-violet-400/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-100/85"
                      >
                        Copy Invite Link
                      </button>
                    </div>
                    <p className="mt-3 break-all text-violet-100/65">{shareLink}</p>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-violet-500/20 bg-slate-950/65 p-4">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-violet-300">
                    Live Race
                  </p>
                  <DuelPreview
                    symA={game.config.rate}
                    symB={game.playerTwoRate ?? "BTC/USD"}
                    autoStart={game.status === "ready"}
                    duration={game.config.duration}
                  />
                  {game.status !== "ready" && (
                    <p className="mt-3 text-xs text-violet-100/50">Waiting for opponent to join before the race starts…</p>
                  )}
                </div>

                {/* Resolve section — shown when deadline has passed and game is active */}
                {game.status === "ready" &&
                  game.onchain.deadlinePosix != null &&
                  Date.now() >= game.onchain.deadlinePosix && (
                    <div className="mt-4 rounded-xl border border-violet-500/20 bg-slate-950/65 p-4">
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-violet-300">
                        Duel Ended — Claim Result
                      </p>
                      {resolveResult?.txHash ? (
                        <p className="break-all text-xs text-cyan-300">
                          Resolved!{" "}
                          <a
                            href={`https://preprod.cardanoscan.io/transaction/${resolveResult.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            View on explorer
                          </a>
                        </p>
                      ) : (
                        <>
                          {resolveResult?.error && (
                            <p className="mb-2 text-xs text-red-400">{resolveResult.error}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleResolve()}
                            disabled={resolving}
                            className="rounded-lg border border-violet-400/60 bg-violet-400/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-100 disabled:opacity-50"
                          >
                            {resolving ? "Resolving…" : "Resolve Duel"}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                <div className="mt-4 rounded-xl border border-violet-500/20 bg-slate-950/65 p-4 text-xs text-violet-100/80">
                  {game.status === "ready" ? (
                    <p className="text-cyan-300">Both players are in. The game is ready to start.</p>
                  ) : canJoin ? (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <p>This game has one player. Go to Join Game to choose your asset and join.</p>
                      <button
                        type="button"
                        onClick={() => void router.push(`/join-game?gameId=${id}`)}
                        className="w-fit rounded-lg border border-violet-400/60 bg-violet-400/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-100"
                      >
                        Join Game Setup
                      </button>
                    </div>
                  ) : isParticipant ? (
                    <p>Waiting for the second player to join...</p>
                  ) : (
                    <p>This game is full. You can create or join another game.</p>
                  )}
                </div>
              </>
            )}
          </section>
        </RequireWallet>
      </main>
    </>
  );
}
