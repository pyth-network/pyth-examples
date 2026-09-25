import type { GameConfig, GameSession } from "@/types/game";

const RATE_SET = new Set(["ADA/USD", "BTC/USD", "ETH/USD", "BNB/USD"]);
const DURATION_SET = new Set(["1m", "5m", "1h"]);
const sessions = new Map<string, GameSession>();

function normalizeWallet(wallet: string) {
  return wallet.trim().toLowerCase();
}

function buildId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function validateGameConfig(input: unknown): GameConfig | null {
  if (!input || typeof input !== "object") return null;

  const cfg = input as Record<string, unknown>;
  const rate = String(cfg.rate ?? "");
  const duration = String(cfg.duration ?? "");
  const betAda = Number(cfg.betAda);

  if (!RATE_SET.has(rate)) return null;
  if (!DURATION_SET.has(duration)) return null;
  if (!Number.isFinite(betAda) || betAda <= 0) return null;

  return {
    rate: rate as GameConfig["rate"],
    duration: duration as GameConfig["duration"],
    betAda,
  };
}

export function createSession(config: GameConfig, creatorWallet: string) {
  const wallet = normalizeWallet(creatorWallet);
  const now = new Date().toISOString();
  let id = buildId();
  while (sessions.has(id)) id = buildId();

  const session: GameSession = {
    id,
    createdAt: now,
    updatedAt: now,
    status: "waiting_for_player",
    config,
    playerOneWallet: wallet,
    playerTwoWallet: null,
    playerTwoRate: null,
    onchain: {
      duelId: null,
      depositATxHash: null,
      depositATxIndex: null,
      depositBTxHash: null,
      playerOnePkh: null,
      playerTwoPkh: null,
      playerOneFeedId: null,
      playerTwoFeedId: null,
      playerOnePriceFeedId: null,
      playerTwoPriceFeedId: null,
      startPriceA: null,
      startPriceB: null,
      deadlinePosix: null,
    },
  };

  sessions.set(id, session);
  return session;
}

export function getSession(id: string) {
  return sessions.get(id.toUpperCase()) ?? null;
}

export function updateSessionOnchain(
  id: string,
  patch: Partial<GameSession["onchain"]>,
) {
  const session = getSession(id);
  if (!session) return null;

  const updated: GameSession = {
    ...session,
    updatedAt: new Date().toISOString(),
    onchain: {
      ...session.onchain,
      ...patch,
    },
  };

  sessions.set(updated.id, updated);
  return updated;
}

export function validateRate(input: unknown): GameConfig["rate"] | null {
  const rate = String(input ?? "");
  if (!RATE_SET.has(rate)) return null;
  return rate as GameConfig["rate"];
}

export function joinSession(id: string, wallet: string, selectedRate: GameConfig["rate"]) {
  const session = getSession(id);
  if (!session) return { error: "not_found" as const, session: null };

  const normalizedWallet = normalizeWallet(wallet);
  if (normalizedWallet === session.playerOneWallet || normalizedWallet === session.playerTwoWallet) {
    return { error: null, session };
  }

  if (session.playerTwoWallet) {
    return { error: "full" as const, session };
  }
  if (selectedRate === session.config.rate) {
    return { error: "same_rate" as const, session };
  }

  const updated: GameSession = {
    ...session,
    playerTwoWallet: normalizedWallet,
    playerTwoRate: selectedRate,
    status: "ready",
    updatedAt: new Date().toISOString(),
  };

  sessions.set(updated.id, updated);
  return { error: null, session: updated };
}
