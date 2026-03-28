// src/services/pythService.ts

type PriceListener = (price: number) => void;

const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL) {
  throw new Error("VITE_API_URL is not defined in .env");
}

const listeners = new Set<PriceListener>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let currentPrice = 0;
let priceHistory: { time: number; value: number }[] = [];
let failCount = 0;

const MAX_HISTORY = 200;
const POLL_INTERVAL = 10_000;    // ✅ 10 segundos base
const MAX_BACKOFF   = 60_000;    // máximo 60 segundos de espera

// ─── API calls ────────────────────────────────────────────────────

export const fetchCurrentPrice = async (): Promise<number> => {
  const res = await fetch(`${BASE_URL}/api/get-adaprice`);
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`get-adaprice failed: HTTP ${res.status}`);
  const data = await res.json();
  return data.price as number;
};

export const fetchPriceRange = async (
  from: number,
  to: number,
  interval = 60
): Promise<{ time: number; value: number }[]> => {
  const res = await fetch(
    `${BASE_URL}/api/get-adaprice-range?from=${from}&to=${to}&interval=${interval}`
  );
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`get-adaprice-range failed: HTTP ${res.status}`);
  const data = await res.json();
  return (data.data as { time: number; value: number }[]).map(
    ({ time, value }) => ({ time, value })
  );
};

// ─── Getters ──────────────────────────────────────────────────────

export const getPrice = () => currentPrice;
export const getPriceHistory = () => [...priceHistory];

// ─── Init ─────────────────────────────────────────────────────────

export const initHistory = async () => {
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - 60 * 60; // última hora

    const [history, price] = await Promise.all([
      fetchPriceRange(from, to, 15),
      fetchCurrentPrice(),
    ]);

    priceHistory = history.slice(-MAX_HISTORY);
    currentPrice = price;
    failCount = 0;
  } catch (e) {
    console.error("[pythService] Error initializing history:", e);
  }
};

// ─── Polling con backoff exponencial ─────────────────────────────

const scheduleNextPoll = () => {
  // Backoff: 10s, 20s, 40s... hasta MAX_BACKOFF
  const delay = Math.min(POLL_INTERVAL * Math.pow(2, failCount), MAX_BACKOFF);

  if (failCount > 0) {
    console.warn(`[pythService] Retrying in ${delay / 1000}s (attempt ${failCount})`);
  }

  intervalId = setTimeout(poll, delay);
};

const poll = async () => {
  try {
    const price = await fetchCurrentPrice();
    currentPrice = price;
    failCount = 0; // reset en éxito

    const lastTime = priceHistory[priceHistory.length - 1]?.time ?? 0;
    const newTime = Math.max(Math.floor(Date.now() / 1000), lastTime + 1);

    priceHistory.push({ time: newTime, value: +price.toFixed(6) });
    if (priceHistory.length > MAX_HISTORY) priceHistory.shift();

    listeners.forEach(fn => fn(price));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    failCount++;
    if (e.message === "RATE_LIMIT") {
      console.warn("[pythService] Rate limited — backing off");
    } else {
      console.error("[pythService] Poll error:", e);
    }
  } finally {
    // Solo reprogramar si hay listeners activos
    if (listeners.size > 0) {
      scheduleNextPoll();
    } else {
      intervalId = null;
    }
  }
};

const startPolling = () => {
  if (intervalId) return;
  scheduleNextPoll();
};

const stopPolling = () => {
  if (intervalId) {
    clearTimeout(intervalId as unknown as ReturnType<typeof setTimeout>);
    intervalId = null;
  }
  failCount = 0;
};

// ─── Subscribe ────────────────────────────────────────────────────

export const subscribe = (fn: PriceListener) => {
  listeners.add(fn);
  startPolling();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) stopPolling();
  };
};

export const subscribeWithHistory = (fn: PriceListener) => subscribe(fn);