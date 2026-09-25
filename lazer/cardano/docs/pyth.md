# Pyth Lazer integration

## What is Pyth Lazer?

Pyth Lazer is a low-latency oracle service from Pyth Network. It streams signed
price updates over WebSocket that can be verified on-chain.

## Connection

The off-chain code connects to three redundant endpoints:

```
wss://pyth-lazer-0.dourolabs.app/v1/stream
wss://pyth-lazer-1.dourolabs.app/v1/stream
wss://pyth-lazer-2.dourolabs.app/v1/stream
```

Authentication uses `PYTH_ACCESS_TOKEN` (environment variable).

## Subscription

```typescript
await client.subscribe({
  type: "subscribe",
  subscriptionId: 1,
  priceFeedIds: [16],          // ADA/USD
  properties: ["price", "exponent"],
  formats: ["solana"],          // signed payload format
  channel: "fixed_rate@200ms",
});
```

## Price format

Pyth Lazer returns prices as mantissa + exponent:

```
price_usd = mantissa × 10^exponent
```

For on-chain use we convert to USD cents:

```
price_cents = mantissa × 10^(exponent + 2)
```

Example with ADA at $0.65:

```
mantissa = 65000000
exponent = -8
price_usd = 65000000 × 10^(-8) = $0.65
price_cents = 65000000 × 10^(-8+2) = 65000000 × 10^(-6) = 65
```

## Payload

The `solana` format field contains a signed binary payload. This payload is
passed as the transaction redeemer so the on-chain validator can verify it
using the `pyth` Aiken library.

## Feed IDs

| Asset   | Feed ID |
|---------|---------|
| ADA/USD | 16      |

## Implementation

| Module | What it does |
|--------|--------------|
| `front/src/lib/pyth.ts` | Server-only Pyth Lazer WebSocket client + in-memory price cache |
| `off-chain/src/nodes/price_fetcher.ts` | CLI version of the same (standalone Node.js) |
| `off-chain/src/nodes/price_cache.ts` | Simple in-memory cache singleton |

Both implementations share the same pattern: connect, subscribe, cache the
latest price, reject if stale (>60s).
