import "dotenv/config";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import type {
  Action,
  ClientMessage,
  Fill,
  Order,
  PositionSummary,
  RollingAverages,
  ServerMessage,
  Side,
} from "./types.js";
import { createBtcPriceStream } from "./streams/btcPrice.js";
import { createOrderbookStream } from "./streams/orderbook.js";
import { createPositionsStream } from "./streams/positions.js";
import { createMarket } from "./offchain/index.js";
import { handleRestRequest } from "./rest.js";

const PORT = 8080;
const AVG_WINDOW = 20;
const MAX_ORDERS_SERVER = 50; // kept in memory for rolling average computation

// ── State ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line prefer-const
let currentMarket!: import("./types.js").Market; // set in async IIFE before first WS connection
let orderWindow: Order[] = [];
let positionSummary: PositionSummary = {
  upContracts: 0,
  upAvgPrice: 0,
  downContracts: 0,
  downAvgPrice: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeRollingAverages(orders: Order[]): RollingAverages {
  const window = orders.slice(0, AVG_WINDOW);
  const avg = (side: Side, action: Action): number => {
    const bucket = window.filter((o) => o.side === side && o.action === action);
    if (bucket.length === 0) return 0.5;
    return bucket.reduce((sum, o) => sum + o.price, 0) / bucket.length;
  };
  return {
    upBuyAvg: avg("UP", "BUY"),
    upSellAvg: avg("UP", "SELL"),
    downBuyAvg: avg("DOWN", "BUY"),
    downSellAvg: avg("DOWN", "SELL"),
  };
}

function updatePositionSummary(
  prev: PositionSummary,
  fill: Fill,
): PositionSummary {
  if (fill.side === "UP") {
    const total = prev.upContracts + fill.quantity;
    const avgPrice =
      total === 0
        ? 0
        : (prev.upAvgPrice * prev.upContracts + fill.price * fill.quantity) /
          total;
    return { ...prev, upContracts: total, upAvgPrice: avgPrice };
  } else {
    const total = prev.downContracts + fill.quantity;
    const avgPrice =
      total === 0
        ? 0
        : (prev.downAvgPrice * prev.downContracts +
            fill.price * fill.quantity) /
          total;
    return { ...prev, downContracts: total, downAvgPrice: avgPrice };
  }
}

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(wss: WebSocketServer, msg: ServerMessage): void {
  wss.clients.forEach((client) => send(client, msg));
}

// ── Server ────────────────────────────────────────────────────────────────────

const httpServer = createServer(handleRestRequest);
const wss = new WebSocketServer({ server: httpServer });
httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

// ── Market lifecycle ──────────────────────────────────────────────────────────

function resetMarketState(): void {
  orderWindow = [];
  positionSummary = {
    upContracts: 0,
    upAvgPrice: 0,
    downContracts: 0,
    downAvgPrice: 0,
  };
}

async function startNextMarket(): Promise<void> {
  currentMarket = await createMarket();
  resetMarketState();
  console.log(
    `[server] market ${currentMarket.id} started, strikePrice=${currentMarket.strikePrice}, ends ${new Date(currentMarket.endTime).toISOString()}`,
  );
  broadcast(wss, { type: "market_started", data: { market: currentMarket } });
  scheduleNextMarket();
}

function scheduleNextMarket(): void {
  const remaining = Math.max(0, currentMarket.endTime - Date.now());
  setTimeout(startNextMarket, remaining);
}

// ── Streams + initial market ──────────────────────────────────────────────────

void (async () => {
  currentMarket = await createMarket();
  console.log(
    `[server] market ${currentMarket.id} started, strikePrice=${currentMarket.strikePrice}, ends ${new Date(currentMarket.endTime).toISOString()}`,
  );
  scheduleNextMarket();

  const { emitter: priceEmitter, getPrice } = await createBtcPriceStream();
  const { emitter: orderbookEmitter, getLatestOrder } =
    createOrderbookStream(getPrice);
  const positionsEmitter = createPositionsStream(getLatestOrder);

  priceEmitter.on("tick", (tick) => {
    broadcast(wss, { type: "price_tick", data: tick });
  });

  orderbookEmitter.on("order", (order: Order) => {
    orderWindow = [order, ...orderWindow].slice(0, MAX_ORDERS_SERVER);
    broadcast(wss, { type: "order", data: order });
    broadcast(wss, {
      type: "rolling_averages",
      data: computeRollingAverages(orderWindow),
    });
  });

  positionsEmitter.on("fill", (fill: Fill) => {
    positionSummary = updatePositionSummary(positionSummary, fill);
    broadcast(wss, { type: "fill", data: fill });
    broadcast(wss, { type: "position_summary", data: positionSummary });
  });
})();

// ── Connection handling ───────────────────────────────────────────────────────

wss.on("connection", (ws) => {
  console.log("[server] client connected");

  // Send initial handshake with the current active market
  send(ws, { type: "connected", data: { market: currentMarket } });

  ws.on("message", (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      console.warn("[server] received non-JSON message, ignoring");
      return;
    }

    if (msg.type === "place_order") {
      const { side, action, price, quantity } = msg.data;
      console.log(
        `[server] place_order received: ${action} ${quantity} ${side} @ ${price.toFixed(4)}`,
      );

      // TODO: Submit the order to the Orderbook smart contract instead of logging.
      //
      //   import { ethers } from "ethers"
      //
      //   const ORDERBOOK_ADDRESS = "0x..." // TODO: deployed contract address
      //   const ABI = [...]                 // TODO: contract ABI
      //   const provider = new ethers.JsonRpcProvider("https://your-rpc-url")
      //   const signer   = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY!, provider)
      //   const contract = new ethers.Contract(ORDERBOOK_ADDRESS, ABI, signer)
      //
      //   const tx = await contract.placeOrder(
      //     side === "UP" ? 0 : 1,
      //     action === "BUY" ? 0 : 1,
      //     ethers.parseEther(price.toString()),
      //     quantity
      //   )
      //   await tx.wait()
      //   console.log(`[server] order submitted: ${tx.hash}`)
    }
  });

  ws.on("close", () => console.log("[server] client disconnected"));
  ws.on("error", (err) => console.error("[server] client error:", err.message));
});
