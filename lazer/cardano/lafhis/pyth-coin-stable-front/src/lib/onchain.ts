import type { GameDuration, GameRate } from "@/types/game";

export const DURATION_TO_MS: Record<GameDuration, number> = {
  "1m": 60_000,
  "5m": 300_000,
  "1h": 3_600_000,
};

const ONCHAIN_FEED_ID_BY_RATE: Partial<Record<GameRate, number>> = {
  "ADA/USD": 16,
  "BTC/USD": 29,
  "ETH/USD": 36,
};

export function getOnchainFeedId(rate: GameRate): number {
  const feedId = ONCHAIN_FEED_ID_BY_RATE[rate];
  if (!feedId) {
    throw new Error(`Missing on-chain feed id for ${rate}`);
  }
  return feedId;
}
