# Pipeline

## Architecture

```
┌────────────────┐     PriceUpdate      ┌──────────────┐     OracleDatum      ┌────────────┐
│  Pyth Lazer    │ ──────────────────→   │   Decision   │  ─────────────────→  │ TX Builder │
│  WebSocket     │  ADA/USD feed 16     │   Engine     │  lock or spend       │ Mesh SDK   │
└────────────────┘                      └──────────────┘                      └─────┬──────┘
                                                                                    │
                                                                          ┌─────────┴─────────┐
                                                                          │                   │
                                                                       lock                spend
                                                                          │                   │
                                                                   ┌──────▼──────┐    ┌───────▼──────┐
                                                                   │  2 ADA →    │    │  script →    │
                                                                   │  script     │    │  wallet      │
                                                                   │  + datum    │    │  + redeemer  │
                                                                   └──────┬──────┘    └───────┬──────┘
                                                                          │                   │
                                                                          ▼                   ▼
                                                                   sign + submit       sign + submit
                                                                   (MeshWallet)        (MeshWallet)
```

## System layers

```
front/src/
  lib/pyth.ts         ← LAYER 1: Pyth Lazer WebSocket (server-only)
  lib/price.ts        ← LAYER 2: decision logic (pure functions)
  lib/cardano.ts      ← LAYER 3: Mesh SDK wallet + TX building (server-only)
  app/api/            ← LAYER 4: Next.js API routes (HTTP surface)
  store/              ← LAYER 5: Zustand state management (client)
  components/         ← LAYER 6: React UI (client)
```

Each layer only knows the one before it. The on-chain validator is independent of all.

## Step 1 — Fetch price

**Code:** `lib/pyth.ts`

Connects to Pyth Lazer WebSocket endpoints, subscribes to ADA/USD (feed 16) at
200ms fixed rate. Converts mantissa × 10^(exponent+2) to USD cents. Caches the
latest update in memory.

## Step 2 — Decide

**Code:** `lib/price.ts`

Pure function that compares the live price against the `OracleDatum` condition:

| Datum variant | Spend if |
|---|---|
| `AnyPrice` | always |
| `MinPrice { min }` | price >= min |
| `MaxPrice { max }` | price <= max |
| `PriceRange { lo, hi }` | lo <= price <= hi |

Also checks staleness: if price is older than `maxAgeSeconds`, returns `block`.

## Step 3a — Lock TX

**Code:** `lib/cardano.ts → lockOracleUtxo`

Sends lovelace to the script address with an inline `OracleDatum`. The wallet
signs and submits automatically (server-side `MeshWallet` with mnemonic).

## Step 3b — Spend TX

**Code:** `lib/cardano.ts → spendOracleUtxo`

Spends a UTxO from the script address. The raw Pyth Lazer payload goes into the
redeemer. The on-chain validator uses the `pyth` Aiken library to verify the
price update and check it against the datum condition.

## Domain types

```typescript
// On-chain datum (mirrors Aiken OracleDatum)
type OracleDatum =
  | { kind: "AnyPrice" }
  | { kind: "MinPrice"; minPriceUsdCents: number }
  | { kind: "MaxPrice"; maxPriceUsdCents: number }
  | { kind: "PriceRange"; loCents: number; hiCents: number };

// What comes from Pyth Lazer
interface PriceUpdate {
  feedId: number;
  priceUsdCents: string;
  timestamp: number;
}

// Decision output
interface ActionDecision {
  action: "lock" | "spend" | "block";
  reason: string;
}
```
