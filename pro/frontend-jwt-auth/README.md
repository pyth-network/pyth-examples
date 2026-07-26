# Pyth Pro Frontend JWT Auth Example

A minimal [Next.js](https://nextjs.org/) app that renders live BTC/USD, ETH/USD, and SOL/USD candlestick charts backed by the [Pyth Pro History API](https://docs.pyth.network/price-feeds/pro/api/history), authenticating every request via the [JWT flow](https://docs.pyth.network/price-feeds/pro/frontend-auth) required since 2026-07-24.

## Prerequisites

- Node.js 18 or newer
- [pnpm](https://pnpm.io/) 9+
- A Pyth Pro API key ([contact Pyth](https://docs.pyth.network/price-feeds/pro))

## Quick start

```bash
cd pro/frontend-jwt-auth
cp .env.example .env.local          # then edit .env.local and set PRO_API_KEY
pnpm install
pnpm dev
```

Open <http://localhost:3000> — you should see three charts populated with the last 24 hours of 1-minute candles.

## How it works

- `src/app/api/pyth-token/route.ts` is a server-only route that forwards `POST /api/pyth-token` to `POST https://pyth.dourolabs.app/auth/token` with `Authorization: Bearer $PRO_API_KEY` and returns the minted `{ access_token, expires_at, token_type }`.
- `src/lib/pythToken.ts` caches the token in the browser and refreshes it 30 seconds before `expires_at`, matching the caching pattern from the [frontend-auth docs](https://docs.pyth.network/price-feeds/pro/frontend-auth).
- `src/lib/pythClient.ts` calls `GET https://pyth.dourolabs.app/v1/fixed_rate@200ms/history?...` with the cached JWT, transparently retrying once on `401` after invalidating the cache.
- `src/components/PythChart.tsx` renders the returned OHLC arrays with [`lightweight-charts`](https://tradingview.github.io/lightweight-charts/) and polls every 30 seconds to append new candles.

## Security notes

- `PRO_API_KEY` is read from `process.env` in the server route only. It is never referenced from a `NEXT_PUBLIC_*` variable and never imported from a client-side file, so it is not included in the browser bundle.
- The mint route in this example has no request auth or rate limit — anyone who can reach `/api/pyth-token` can mint a JWT with your `PRO_API_KEY`. **Before running this in production, add authentication (e.g. a session cookie check) and a rate limit to `/api/pyth-token`.**
- The mint route mirrors the upstream error body verbatim for easier debugging. In production, log the upstream response server-side and return a generic error instead.

## Configuration

| Variable                        | Where       | Default                      | Purpose                                                    |
| ------------------------------- | ----------- | ---------------------------- | ---------------------------------------------------------- |
| `PRO_API_KEY`                   | Server only | — (required)                 | Long-lived Pyth Pro API key used to mint short-lived JWTs. |
| `PYTH_API_BASE_URL`             | Server      | `https://pyth.dourolabs.app` | Override for non-prod environments.                        |
| `NEXT_PUBLIC_PYTH_API_BASE_URL` | Browser     | `https://pyth.dourolabs.app` | Override the History API base used from the browser.       |

## Scripts

- `pnpm dev` — Next.js dev server on `http://localhost:3000`
- `pnpm build` — Production build (does not require `PRO_API_KEY`)
- `pnpm start` — Serve the production build
- `pnpm test:format` — Prettier check
- `pnpm test:types` — `tsc --noEmit`

## References

- [Pyth Pro frontend auth](https://docs.pyth.network/price-feeds/pro/frontend-auth) (primary reference for the JWT flow)
- [Pyth Pro History API](https://docs.pyth.network/price-feeds/pro/api/history)
- [Auth-required announcement](https://dev-forum.pyth.network/t/action-required-pyth-pro-history-api-auth-required-starting-july-24/808/2)
