export interface Market {
  id: string; // crypto.randomUUID() — future: on-chain market ID (uint256)
  startTime: number; // ms timestamp — future: from block.timestamp at creation
  endTime: number; // ms timestamp — future: startTime + duration from contract
  strikePrice: number; // future: read from contract's stored strike at creation
}

export type Side = "UP" | "DOWN";
export type Action = "BUY" | "SELL";
export type MarketOutcome = "UP" | "DOWN";
export type UserResult = "WON" | "LOST";

export interface UserPosition {
  side: Side;
  quantity: number;
  avgPrice: number; // price paid per share (0–1)
  result: UserResult;
  pnl: number; // quantity*(1-avgPrice) if won, -quantity*avgPrice if lost
}

export interface MarketHistoryEntry {
  marketId: string;
  startTime: number; // ms
  endTime: number; // ms
  strikePrice: number;
  finalBtcPrice: number;
  outcome: MarketOutcome; // which side won
  userPosition: UserPosition | null; // null if address had no shares
}

export interface PriceTick {
  timestamp: number;
  btcPriceStr: string; // display-ready decimal string, e.g. "67543.21" (BigNumber-computed)
  btcPriceRaw: string; // raw Pyth integer string, e.g. "6754321000000"
  exponent: number; // e.g. -8; actual = btcPriceRaw * 10^exponent
}

export interface Order {
  id: string;
  timestamp: number;
  side: Side;
  action: Action;
  price: number; // 0–1 probability price of the bet position
  quantity: number;
  ownerAddress: string; // plain string; format determined by backend/wallet
}

export interface Fill {
  id: string;
  timestamp: number;
  side: Side;
  quantity: number;
  price: number;
  ownerAddress: string;
}

export interface PositionSummary {
  upContracts: number;
  upAvgPrice: number;
  downContracts: number;
  downAvgPrice: number;
}

export interface RollingAverages {
  upBuyAvg: number;
  upSellAvg: number;
  downBuyAvg: number;
  downSellAvg: number;
}

// ── Server → Client ───────────────────────────────────────────────────────────

export type ServerMessage =
  | { type: "connected"; data: { market: Market } }
  | { type: "market_started"; data: { market: Market } }
  | { type: "price_tick"; data: PriceTick }
  | { type: "order"; data: Order }
  | { type: "fill"; data: Fill }
  | { type: "position_summary"; data: PositionSummary }
  | { type: "rolling_averages"; data: RollingAverages };

// ── Client → Server ───────────────────────────────────────────────────────────

export interface PlaceOrderPayload {
  side: Side;
  action: Action;
  price: number;
  quantity: number;
}

export type ClientMessage = { type: "place_order"; data: PlaceOrderPayload };
