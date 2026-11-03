import index from "./index.html";
import { startBot, botState } from "./bot.ts";
import { createPythStream, FEED_NAME_TO_ID } from "./lib/pyth.ts";
import { setupBlaze, Core } from "./lib/cardano.ts";
import { buildBetTxForWallet } from "./lib/market.ts";
import { serializeMarket } from "./lib/types.ts";
import type { PriceSnapshot } from "./lib/types.ts";

// ── Pyth Streaming ──────────────────────────────────────────────────────

async function initPythStream() {
  try {
    await createPythStream(
      [FEED_NAME_TO_ID["BTC/USD"]],
      (_feedId, snapshot) => {
        botState.latestPrice = snapshot;
        server.publish("prices", JSON.stringify({
          type: "price",
          data: { ...snapshot, rawPrice: snapshot.rawPrice.toString() },
        }));
      }
    );
    console.log("[pyth] Streaming connected");
  } catch (err: any) {
    console.error("[pyth] Stream init failed:", err.message);
  }
}

// ── Server ──────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: 4000,

  routes: {
    "/": index,

    "/api/market": () => Response.json(serializeMarket(botState.currentMarket)),

    "/api/price": () => {
      if (!botState.latestPrice) return Response.json(null);
      return Response.json({
        ...botState.latestPrice,
        rawPrice: botState.latestPrice.rawPrice.toString(),
      });
    },

    "/api/history": () => Response.json(botState.marketHistory.map(serializeMarket)),

    "/api/status": () => Response.json({
      botStatus: botState.botStatus,
      cycleCount: botState.cycleCount,
      lastError: botState.lastError,
    }),

    "/api/hex-to-bech32": (req: Request) => {
      const hex = new URL(req.url).searchParams.get("hex");
      if (!hex) return Response.json({ error: "missing hex" }, { status: 400 });
      try {
        const addr = Core.Address.fromBytes(Core.HexBlob(hex));
        return Response.json({ bech32: addr.toBech32() });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 400 });
      }
    },

    "/api/build-bet": {
      async POST(req) {
        try {
          const body = await req.json() as {
            direction: "yes" | "no";
            amountAda: number;
            utxos: string[];       // CIP-30 CBOR hex UTxOs from wallet
            changeAddress: string; // CIP-30 hex address
          };
          if (!botState.currentMarket || botState.currentMarket.resolved) {
            return Response.json({ error: "No active market" }, { status: 400 });
          }
          const m = botState.currentMarket;
          const { provider } = await setupBlaze();
          const { tx, tokensOut } = await buildBetTxForWallet({
            provider,
            policyId: m.policyId,
            oneShotTx: m.oneShotTx,
            oneShotIdx: m.oneShotIdx,
            direction: body.direction,
            amountAda: BigInt(body.amountAda),
            walletUtxos: body.utxos,
            changeAddress: body.changeAddress,
          });
          return Response.json({
            txCbor: tx.toCbor(),
            tokensOut: tokensOut.toString(),
          });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },

    "/api/finalize": {
      async POST(req) {
        try {
          const body = await req.json() as { txCbor: string; witness: string };
          const tx = Core.Transaction.fromCbor(Core.TxCBOR(body.txCbor));
          const signed = Core.TransactionWitnessSet.fromCbor(Core.HexBlob(body.witness));
          // Merge wallet vkeys into tx — same pattern as blaze signTransaction
          const ws = tx.witnessSet();
          const existing = ws.vkeys()?.toCore() ?? [];
          const walletKeys = signed.vkeys();
          if (walletKeys) {
            ws.setVkeys(
              Core.CborSet.fromCore(
                [...walletKeys.toCore(), ...existing],
                Core.VkeyWitness.fromCore,
              ),
            );
          }
          tx.setWitnessSet(ws);
          return Response.json({ txCbor: tx.toCbor() });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },

  fetch(req, server) {
    if (new URL(req.url).pathname === "/ws") {
      if (server.upgrade(req)) return undefined;
      return new Response("WebSocket upgrade failed", { status: 500 });
    }
    return new Response("Not found", { status: 404 });
  },

  websocket: {
    open(ws) {
      ws.subscribe("prices");
      ws.subscribe("market");
      // Send initial state
      ws.send(JSON.stringify({ type: "market", data: serializeMarket(botState.currentMarket) }));
      ws.send(JSON.stringify({ type: "history", data: botState.marketHistory.map(serializeMarket) }));
      ws.send(JSON.stringify({ type: "status", data: {
        botStatus: botState.botStatus,
        cycleCount: botState.cycleCount,
        lastError: botState.lastError,
      }}));
      if (botState.latestPrice) {
        ws.send(JSON.stringify({
          type: "price",
          data: { ...botState.latestPrice, rawPrice: botState.latestPrice.rawPrice.toString() },
        }));
      }
    },
    message() {},
    close(ws) {
      ws.unsubscribe("prices");
      ws.unsubscribe("market");
    },
  },
});

console.log(`Server running at ${server.url}`);

// ── Start services ──────────────────────────────────────────────────────

initPythStream();

startBot(() => {
  server.publish("market", JSON.stringify({
    type: "market", data: serializeMarket(botState.currentMarket),
  }));
  server.publish("market", JSON.stringify({
    type: "status", data: {
      botStatus: botState.botStatus,
      cycleCount: botState.cycleCount,
      lastError: botState.lastError,
    },
  }));
  server.publish("market", JSON.stringify({
    type: "history", data: botState.marketHistory.map(serializeMarket),
  }));
});
