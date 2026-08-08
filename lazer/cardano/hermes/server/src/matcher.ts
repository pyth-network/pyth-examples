import "dotenv/config";
import { getOpenOrders, removeOrder } from "./offchain/index.js";

const POLL_INTERVAL_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMatcher(): Promise<void> {
  console.log("[matcher] starting, polling every", POLL_INTERVAL_MS, "ms");

  while (true) {
    const orders = getOpenOrders();
    // Only BUY orders on both sides participate in matching
    const upBuys = orders.filter((o) => o.side === "UP" && o.action === "BUY");
    const downBuys = orders.filter(
      (o) => o.side === "DOWN" && o.action === "BUY",
    );

    for (const up of upBuys) {
      for (const down of downBuys) {
        if (up.price + down.price !== 1) continue;

        const qty = Math.min(up.quantity, down.quantity);
        console.log(
          `[matcher] matched  UP@${up.price.toFixed(4)} + DOWN@${down.price.toFixed(4)}` +
            `  qty=${qty}  buyer=${up.ownerAddress} vs ${down.ownerAddress}`,
        );

        // TODO: Replace with on-chain match call:
        //   await contract.matchOrders(up.id, down.id, qty)
        removeOrder(up.id);
        removeOrder(down.id);
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

runMatcher().catch((err: unknown) => {
  console.error("[matcher] fatal:", err);
  process.exit(1);
});
