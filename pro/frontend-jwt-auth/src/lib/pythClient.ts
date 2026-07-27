import { getPythToken, invalidatePythToken } from "./pythToken";

// The public browser default matches the server default in
// src/app/api/pyth-token/route.ts. History requests go directly from the
// browser to the Pyth Pro API; only the mint endpoint is proxied through
// this app so `PRO_API_KEY` stays server-side.
const DEFAULT_PYTH_API_BASE_URL = "https://pyth.dourolabs.app";

// The `fixed_rate@200ms` channel matches the example in the docs. Change here
// to try a different channel (e.g. `real_time`).
export const PYTH_CHANNEL = "fixed_rate@200ms";

// Public, non-secret. `NEXT_PUBLIC_*` env vars are inlined into the browser
// bundle at build time; `PRO_API_KEY` must never be exposed this way.
const PYTH_API_BASE_URL =
  process.env.NEXT_PUBLIC_PYTH_API_BASE_URL ?? DEFAULT_PYTH_API_BASE_URL;

export interface HistoryResponse {
  s: "ok" | "no_data" | "error";
  // A `no_data` (or `error`) response may omit the OHLC arrays entirely.
  t?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
  errmsg?: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function candlesFromHistory(history: HistoryResponse): Candle[] {
  const { t, o, h, l, c } = history;
  if (!t || !o || !h || !l || !c) {
    return [];
  }
  const n = Math.min(t.length, o.length, h.length, l.length, c.length);
  const out: Candle[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = {
      time: t[i]!,
      open: o[i]!,
      high: h[i]!,
      low: l[i]!,
      close: c[i]!,
    };
  }
  return out;
}

export interface FetchHistoryOptions {
  symbol: string;
  from: number;
  to: number;
  resolution: string;
  channel?: string;
}

async function fetchHistoryOnce(
  { symbol, from, to, resolution, channel = PYTH_CHANNEL }: FetchHistoryOptions,
  token: string,
): Promise<Response> {
  const url = new URL(`${PYTH_API_BASE_URL}/v1/${channel}/history`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("from", String(from));
  url.searchParams.set("to", String(to));
  url.searchParams.set("resolution", resolution);
  return fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchHistory(
  options: FetchHistoryOptions,
): Promise<HistoryResponse> {
  let token = await getPythToken();
  let response = await fetchHistoryOnce(options, token);

  if (response.status === 401) {
    // Token likely expired in-flight or was revoked. Force a fresh mint and
    // retry exactly once.
    invalidatePythToken();
    token = await getPythToken();
    response = await fetchHistoryOnce(options, token);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Pyth history request failed: ${response.status} ${response.statusText}${
        detail ? ` (${detail})` : ""
      }`,
    );
  }

  const body = (await response.json()) as HistoryResponse;
  if (body.s === "error") {
    throw new Error(`Pyth history returned error: ${body.errmsg ?? "unknown"}`);
  }
  return body;
}
