import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  MarketHistoryEntry,
  MarketOutcome,
  Side,
  UserPosition,
} from "./types.js";

// TODO: Replace getMockHistory() with real blockchain reads:
//
//   import { ethers } from "ethers"
//
//   const CONTRACT_ADDRESS = "0x..." // TODO: deployed market factory address
//   const ABI = [...]                // TODO: contract ABI
//   const provider = new ethers.JsonRpcProvider("https://your-rpc-url")
//   const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)
//
//   async function getHistory(address: string): Promise<MarketHistoryEntry[]> {
//     const marketCount = await contract.marketCount()
//     const entries: MarketHistoryEntry[] = []
//     for (let i = Number(marketCount) - 1; i >= 0; i--) {
//       const market   = await contract.markets(i)
//       const pos      = address ? await contract.positionOf(i, address) : null
//       entries.push({
//         marketId:      i.toString(),
//         startTime:     Number(market.startTime) * 1000,
//         endTime:       Number(market.endTime) * 1000,
//         strikePrice:   Number(market.strikePrice) / 1e18,
//         finalBtcPrice: Number(market.finalPrice) / 1e18,
//         outcome:       Number(market.finalPrice) > Number(market.strikePrice) ? "UP" : "DOWN",
//         userPosition:  pos && Number(pos.quantity) > 0 ? {
//           side:     Number(pos.side) === 0 ? "UP" : "DOWN",
//           quantity: Number(pos.quantity),
//           avgPrice: Number(pos.avgPrice) / 1e18,
//           result:   /* derive from outcome vs side */,
//           pnl:      /* derive from result */,
//         } : null,
//       })
//     }
//     return entries
//   }

const STRIKE = 67_500;
const MARKET_DURATION_MS = 5 * 60 * 1000;

// Stable mock final prices — alternating above/below strike
const MOCK_FINALS = [67_820, 67_210, 68_100, 66_950, 67_640];

// Markets where the user has a position (by index into the 5-entry list)
const USER_POSITION_INDICES = new Set([0, 2, 3]);

function buildUserPosition(
  index: number,
  outcome: MarketOutcome,
  address: string,
): UserPosition | null {
  if (!address || !USER_POSITION_INDICES.has(index)) return null;

  // Mock: user always bet UP in markets 0 and 2, DOWN in market 3
  const side: Side = index === 3 ? "DOWN" : "UP";
  const quantity = (index + 1) * 50;
  const avgPrice = 0.48 + index * 0.02;
  const won = side === outcome;
  const pnl = won
    ? Math.round(quantity * (1 - avgPrice) * 100) / 100
    : Math.round(-quantity * avgPrice * 100) / 100;

  return {
    side,
    quantity,
    avgPrice,
    result: won ? "WON" : "LOST",
    pnl,
  };
}

function getMockHistory(address: string): MarketHistoryEntry[] {
  const now = Date.now();
  return MOCK_FINALS.map((finalBtcPrice, i) => {
    const endTime = now - i * MARKET_DURATION_MS;
    const startTime = endTime - MARKET_DURATION_MS;
    const outcome: MarketOutcome = finalBtcPrice > STRIKE ? "UP" : "DOWN";
    return {
      marketId: `mock-market-${5 - i}`,
      startTime,
      endTime,
      strikePrice: STRIKE,
      finalBtcPrice,
      outcome,
      userPosition: buildUserPosition(i, outcome, address),
    };
  });
}

function setCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
}

export function handleRestRequest(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/markets/history") {
    const address = url.searchParams.get("address") ?? "";
    setCors(res);
    res.writeHead(200);
    res.end(JSON.stringify(getMockHistory(address)));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "not found" }));
}
