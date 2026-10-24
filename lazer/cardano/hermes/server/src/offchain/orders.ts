import type { Action, Order, Side } from "../types.js";

// TODO: Replace every function body with smart contract calls, e.g.:
//
//   import { ethers } from "ethers"
//   const contract = new ethers.Contract(ORDERBOOK_ADDRESS, ABI, signer)
//
//   export async function createOrder(...): Promise<Order> {
//     const tx = await contract.placeOrder(side, action, price, quantity)
//     await tx.wait()
//     return fetchOrderFromChain(tx)
//   }
//
//   export async function getOpenOrders(): Promise<Order[]> {
//     return contract.getOpenOrders()
//   }
//
//   export async function removeOrder(id: string): Promise<void> {
//     // handled on-chain when orders are matched; no separate removal needed
//   }

// ── MOCK ──────────────────────────────────────────────────────────────────────
const store = new Map<string, Order>();

export function createOrder(
  side: Side,
  action: Action,
  price: number,
  quantity: number,
  ownerAddress: string,
): Order {
  const order: Order = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    side,
    action,
    price,
    quantity,
    ownerAddress,
  };
  store.set(order.id, order);
  return order;
}

export function getOpenOrders(): Order[] {
  // MOCK: returns the in-memory store (empty until createOrder is called)
  return [...store.values()];
}

export function removeOrder(id: string): void {
  store.delete(id);
}
// ── END MOCK ──────────────────────────────────────────────────────────────────
