export interface MarketState {
  policyId: string;
  oneShotTx: string;
  oneShotIdx: number;
  creator: string;
  feedId: number;
  targetPrice: bigint;
  resolutionTime: number;
  yesReserve: bigint;
  noReserve: bigint;
  k: bigint;
  totalYesMinted: bigint;
  totalNoMinted: bigint;
  totalAda: bigint;
  resolved: boolean;
  winningSide: "yes" | "no" | null;
}

export interface PythUpdate {
  solanaHex: string;
  price: bigint;
  exponent: number;
  feedId: number;
}

export interface PriceSnapshot {
  price: number;
  rawPrice: bigint;
  exponent: number;
  timestamp: number;
}

export interface BotState {
  currentMarket: MarketState | null;
  marketHistory: MarketState[];
  latestPrice: PriceSnapshot | null;
  botStatus: "idle" | "creating" | "waiting" | "resolving" | "error";
  cycleCount: number;
  lastError: string | null;
}

export type WsMessage =
  | { type: "price"; data: any }
  | { type: "market"; data: any }
  | { type: "status"; data: any }
  | { type: "history"; data: any };

export function serializeMarket(m: MarketState | null) {
  if (!m) return null;
  return {
    ...m,
    targetPrice: m.targetPrice.toString(),
    yesReserve: m.yesReserve.toString(),
    noReserve: m.noReserve.toString(),
    k: m.k.toString(),
    totalYesMinted: m.totalYesMinted.toString(),
    totalNoMinted: m.totalNoMinted.toString(),
    totalAda: m.totalAda.toString(),
  };
}
