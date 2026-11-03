import { EventEmitter } from "node:events";
import type { Action, Order, Side } from "../types.js";

// TODO: Replace the mock below with real smart contract events.
//
// The Orderbook contract emits an "OrderPlaced" event whenever a new limit
// order is submitted on-chain. Subscribe using ethers.js or viem:
//
//   import { ethers } from "ethers"
//
//   const ORDERBOOK_ADDRESS = "0x..." // TODO: fill in deployed contract address
//   const ABI = [...] // TODO: fill in contract ABI (at minimum the OrderPlaced event)
//
//   const provider = new ethers.WebSocketProvider("wss://your-rpc-url")
//   const contract = new ethers.Contract(ORDERBOOK_ADDRESS, ABI, provider)
//
//   contract.on("OrderPlaced", (id, owner, side, action, price, qty, ts) => {
//     const order: Order = {
//       id:           id.toString(),
//       timestamp:    Number(ts) * 1000,       // contract emits unix seconds
//       side:         side === 0n ? "UP" : "DOWN",
//       action:       action === 0n ? "BUY" : "SELL",
//       price:        Number(price) / 1e18,    // contract stores as uint256 wei-scaled
//       quantity:     Number(qty),
//       ownerAddress: owner,
//     }
//     emitter.emit("order", order)
//   })
//
// Remove the MOCK block below once the real subscription is wired in.

const ADDRESS_POOL = Array.from({ length: 10 }, (_, i) => `addr_${i + 1}`);
const STRIKE = 67_500;
const INTERVAL_MS = 300;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function createOrderbookStream(getBtcPrice: () => number | undefined): {
  emitter: EventEmitter;
  getLatestOrder: () => Order | null;
} {
  const emitter = new EventEmitter();
  let latestOrder: Order | null = null;

  // ── MOCK: remove once real contract events are wired in ───────────────────
  setInterval(() => {
    const btcPrice = getBtcPrice();
    if (btcPrice === undefined) return; // wait for first Pyth tick
    const side: Side = Math.random() > 0.5 ? "UP" : "DOWN";
    const action: Action = Math.random() > 0.5 ? "BUY" : "SELL";
    const baseUpProb = clamp(0.5 + (btcPrice - STRIKE) / 10_000, 0.05, 0.95);
    const ref = side === "UP" ? baseUpProb : 1 - baseUpProb;
    const price = clamp(ref + (Math.random() - 0.5) * 0.06, 0.01, 0.99);
    const order: Order = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      side,
      action,
      price,
      quantity: Math.floor(Math.random() * 500) + 1,
      ownerAddress:
        ADDRESS_POOL[Math.floor(Math.random() * ADDRESS_POOL.length)],
    };
    latestOrder = order;
    emitter.emit("order", order);
  }, INTERVAL_MS);
  // ── END MOCK ──────────────────────────────────────────────────────────────

  return { emitter, getLatestOrder: () => latestOrder };
}
