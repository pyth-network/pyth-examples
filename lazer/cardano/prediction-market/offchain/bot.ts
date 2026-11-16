import { setupBlaze } from "./lib/cardano.ts";
import { createMarket, resolveMarket, deriveMarket, parseDatum } from "./lib/market.ts";
import type { BotState, MarketState } from "./lib/types.ts";

const MARKET_DURATION_MS = 5 * 60_000; // 5-minute markets
const SEED_ADA = 10n;
const CONFIRM_WAIT_MS = 30_000;
const MAX_HISTORY = 20;

export const botState: BotState = {
  currentMarket: null,
  marketHistory: [],
  latestPrice: null,
  botStatus: "idle",
  cycleCount: 0,
  lastError: null,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function startBot(onStateChange: () => void) {
  const { blaze, provider, wallet } = await setupBlaze();
  console.log(`[bot] Wallet: ${wallet.address.toBech32()}`);

  while (true) {
    try {
      // ── CREATE ──
      botState.botStatus = "creating";
      botState.lastError = null;
      onStateChange();
      console.log(`[bot] Cycle ${botState.cycleCount + 1}: Creating market...`);

      const result = await createMarket({
        blaze, provider, wallet,
        feedName: "BTC/USD",
        seedAda: SEED_ADA,
        resolutionMs: MARKET_DURATION_MS,
      });
      console.log(`[bot] Created: ${result.txId} (policy: ${result.policyId})`);

      // Poll until market UTxO appears on-chain
      let derived;
      for (let attempt = 1; attempt <= 12; attempt++) {
        await sleep(10_000);
        try {
          derived = await deriveMarket(provider, result.policyId, result.oneShotTx, result.oneShotIdx);
          break;
        } catch {
          console.log(`[bot] Waiting for confirmation... (${attempt * 10}s)`);
        }
      }
      if (!derived) throw new Error("Market UTxO not confirmed after 120s");
      botState.currentMarket = parseDatum(derived.df, result.policyId, result.oneShotTx, result.oneShotIdx);
      botState.botStatus = "waiting";
      onStateChange();

      // ── WAIT for resolution ──
      const waitMs = botState.currentMarket.resolutionTime - Date.now();
      if (waitMs > 0) {
        console.log(`[bot] Waiting ${Math.round(waitMs / 1000)}s for resolution...`);
        await sleep(waitMs);
      }

      // ── RESOLVE ──
      botState.botStatus = "resolving";
      onStateChange();
      console.log(`[bot] Resolving...`);

      const resolveResult = await resolveMarket({
        blaze, provider, wallet,
        policyId: result.policyId,
        oneShotTx: result.oneShotTx,
        oneShotIdx: result.oneShotIdx,
      });
      console.log(`[bot] Resolved: ${resolveResult.txId} (winner: ${resolveResult.winner})`);

      // Archive
      if (botState.currentMarket) {
        botState.currentMarket.resolved = true;
        botState.currentMarket.winningSide = resolveResult.winner;
        botState.marketHistory.unshift({ ...botState.currentMarket });
        if (botState.marketHistory.length > MAX_HISTORY) botState.marketHistory.pop();
      }
      botState.currentMarket = null;
      botState.cycleCount++;
      onStateChange();

      // Wait for resolve confirmation before next cycle
      console.log(`[bot] Waiting for resolve confirmation...`);
      await sleep(CONFIRM_WAIT_MS);
      // Extra wait to ensure wallet UTxOs are updated for next create
      await sleep(10_000);

    } catch (err: any) {
      botState.botStatus = "error";
      botState.lastError = err.message ?? String(err);
      onStateChange();
      console.error(`[bot] Error:`, err.message);

      const delay = Math.min(5000 * Math.pow(2, Math.min(botState.cycleCount, 3)), 30000);
      console.log(`[bot] Retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}
