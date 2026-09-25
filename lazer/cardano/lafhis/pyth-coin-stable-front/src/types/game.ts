export type GameDuration = "1m" | "5m" | "1h";
export type GameRate = "ADA/USD" | "BTC/USD" | "ETH/USD" | "BNB/USD";
export type GameStatus = "waiting_for_player" | "ready";

export type GameConfig = {
  rate: GameRate;
  betAda: number;
  duration: GameDuration;
};

export type GameSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: GameStatus;
  config: GameConfig;
  playerOneWallet: string;
  playerTwoWallet: string | null;
  playerTwoRate: GameRate | null;
  onchain: {
    duelId: string | null;
    depositATxHash: string | null;
    depositATxIndex: number | null;
    depositBTxHash: string | null;
    playerOnePkh: string | null;
    playerTwoPkh: string | null;
    playerOneFeedId: number | null;
    playerTwoFeedId: number | null;
    playerOnePriceFeedId: string | null;
    playerTwoPriceFeedId: string | null;
    startPriceA: number | null;
    startPriceB: number | null;
    deadlinePosix: number | null;
  };
};
