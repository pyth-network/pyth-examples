import { EventEmitter } from "node:events";
import type { Fill, Order } from "../types.js";

// TODO: Replace the mock below with real smart contract events.
//
// The Market (settlement) contract emits an "OrderFilled" event when two
// orders are matched on-chain. Subscribe using ethers.js or viem:
//
//   import { ethers } from "ethers"
//
//   const MARKET_ADDRESS = "0x..." // TODO: fill in deployed contract address
//   const ABI = [...] // TODO: fill in contract ABI (at minimum the OrderFilled event)
//
//   const provider = new ethers.WebSocketProvider("wss://your-rpc-url")
//   const contract = new ethers.Contract(MARKET_ADDRESS, ABI, provider)
//
//   contract.on("OrderFilled", (id, owner, side, qty, price, ts) => {
//     const fill: Fill = {
//       id:           id.toString(),
//       timestamp:    Number(ts) * 1000,       // contract emits unix seconds
//       side:         side === 0n ? "UP" : "DOWN",
//       quantity:     Number(qty),
//       price:        Number(price) / 1e18,    // uint256 wei-scaled
//       ownerAddress: owner,
//     }
//     emitter.emit("fill", fill)
//   })
//
// Remove the MOCK block below once the real subscription is wired in.

const ADDRESS_POOL = Array.from({ length: 10 }, (_, i) => `addr_${i + 1}`);
const INTERVAL_MS = 800;

export function createPositionsStream(
  getLatestOrder: () => Order | null,
): EventEmitter {
  const emitter = new EventEmitter();

  // ── MOCK: remove once real contract events are wired in ───────────────────
  setInterval(() => {
    const latest = getLatestOrder();
    if (!latest) return;
    const fill: Fill = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      side: latest.side,
      quantity: Math.floor(latest.quantity * (0.3 + Math.random() * 0.7)),
      price: latest.price,
      ownerAddress:
        ADDRESS_POOL[Math.floor(Math.random() * ADDRESS_POOL.length)],
    };
    emitter.emit("fill", fill);
  }, INTERVAL_MS);
  // ── END MOCK ──────────────────────────────────────────────────────────────

  return emitter;
}
