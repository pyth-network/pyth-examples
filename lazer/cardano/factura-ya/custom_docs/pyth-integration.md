# Pyth Integration Research — Cardano

> Last updated: 2026-03-22 (updated with hackathon-day info)

---

## Pyth Pro (formerly Pyth Lazer)

Pyth has two products:

- **Pyth Core**: Classic aggregated oracle. 100+ chains. Pull model via Hermes relay. **Does NOT support Cardano.**
- **Pyth Pro (formerly Lazer)**: Enterprise-grade. Delivers prices directly from first-party publishers. Customizable update frequencies. **Supports Cardano (Beta).**

For Cardano, **only Pyth Pro is available**.

## PreProd Deployment

**Policy ID (PreProd):** `d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6`

This identifies the Pyth State UTxO on Cardano PreProd testnet. Supplied to both the on-chain and off-chain SDKs.

**API Key:** Obtained from the Pyth/judge's table at the hackathon. Required for the off-chain SDK WebSocket connection.

## On-Chain Integration Pattern

Pyth on Cardano uses a **withdraw-script verification pattern** — NOT reference inputs with price datums.

### How it works

1. **Off-chain**: App fetches signed price update from Pyth Pro (`@pythnetwork/pyth-lazer-sdk`). Requests updates in "solana" binary format (little-endian, Ed25519-signed — same format used for both Cardano and Solana).
2. **Transaction construction** (using `@pythnetwork/pyth-lazer-cardano-js` + Evolution SDK):
   - Set a short validity window (+/- 60 seconds).
   - Include the **Pyth State UTxO** as a **reference input** (holds the "Pyth State NFT" identified by the policy ID, containing trusted signer keys).
   - Perform a **zero-lovelace withdrawal** from the Pyth withdraw script, passing the signed price update bytes as the **redeemer**.
   - Include your own consuming smart contract in the same transaction.
3. **On-chain verification**: The Pyth withdraw script (Plutus V3 staking validator) verifies the Ed25519 signature against trusted signers in the Pyth State UTxO. Your contract calls `pyth.get_updates()` which reads the verified data from the redeemer.

**Key insight**: Price data does NOT live in a UTxO datum. It arrives **transiently via the withdraw script redeemer** in each transaction. The only persistent on-chain data is the Pyth State UTxO (trusted signer keys).

## Aiken Library

Official library: `pyth-network/pyth-lazer-cardano` (vendored locally in `contracts/lib/` due to compiler issue with GitHub dependency).

### Key function

```aiken
pyth.get_updates(pyth_id: PolicyId, self: Transaction) -> List<PriceUpdate>
```

### Minimal on-chain example (from official docs)

```aiken
use aiken/collection/list
use aiken/math/rational.{Rational}
use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}
use pyth
use types/u32

fn read_ada_usd_price(pyth_id: PolicyId, self: Transaction) -> Rational {
  expect [update] = pyth.get_updates(pyth_id, self)
  expect Some(feed) = list.find(update.feeds, fn(feed) {
    u32.as_int(feed.feed_id) == 16
  })
  expect Some(Some(price)) = feed.price
  expect Some(exponent) = feed.exponent
  expect Some(multiplier) = rational.from_int(10)
    |> rational.pow(exponent)

  rational.from_int(price) |> rational.mul(multiplier)
}
```

### Library modules
- `lib/pyth.ak` — Main module: `get_updates()`, `Feed`, `PriceUpdate` types
- `lib/pyth/message.ak` — Ed25519 signature verification, trusted signer checking
- `lib/parser.ak` — Parser combinator library for binary data
- `lib/types/` — Integer types: `u8`, `u16`, `u32`, `u64`, `i16`, `i64`

Requires: Plutus V3, Aiken v1.1.21, aiken-lang/stdlib v3.0.0.

## Data Structures

### PriceUpdate
```
{
  timestamp_us: U64,
  channel_id: U8,
  feeds: List<Feed>
}
```

### Feed
```
{
  feed_id: U32,              -- numeric ID (e.g., 16 for ADA/USD)
  price: Option<Option<Int>>,
  best_bid_price: Option<Option<Int>>,
  best_ask_price: Option<Option<Int>>,
  publisher_count: Option<U16>,
  exponent: Option<Int>,
  confidence: Option<Option<Int>>,
  funding_rate: Option<Option<Int>>,
  funding_timestamp: Option<Option<U64>>,
  funding_rate_interval: Option<Option<U64>>,
  market_session: Option<MarketSession>,
  ema_price: Option<Option<Int>>,
  ema_confidence: Option<Option<Int>>,
  feed_update_timestamp: Option<Option<U64>>
}
```

### Binary message format
4-byte magic (`b9011a82`) → 64-byte Ed25519 signature → 32-byte verification key → 2-byte LE payload length → payload.

### Pyth State (on-chain, persistent)
```
{
  governance: Governance,        -- wormhole policy, emitter chain/address, sequence
  trusted_signers: TrustedSigners, -- verification keys mapped to validity ranges
  withdraw_script: ScriptHash
}
```

## Off-Chain SDKs

### 1. Price fetching: `@pythnetwork/pyth-lazer-sdk`

```typescript
import { PythLazerClient } from "@pythnetwork/pyth-lazer-sdk";

const lazer = await PythLazerClient.create(
  ["wss://pyth-lazer.dourolabs.app/v2/ws"],
  PYTH_API_KEY,
);

const latestPrice = await lazer.getLatestPrice({
  channel: "fixed_rate@200ms",
  formats: ["solana"],
  jsonBinaryEncoding: "hex",
  priceFeedIds: [16],  // ADA/USD
  properties: ["price", "exponent"],
});

const update = Buffer.from(latestPrice.solana.data, "hex");
```

### 2. Transaction helpers: `@pythnetwork/pyth-lazer-cardano-js`

```typescript
import { ScriptHash } from "@evolution-sdk/evolution";
import {
  getPythScriptHash,
  getPythState,
} from "@pythnetwork/pyth-lazer-cardano-js";

const POLICY_ID = "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6";

const pythState = await getPythState(POLICY_ID, client);
const pythScript = getPythScriptHash(pythState);

const now = BigInt(Date.now());
const tx = wallet
  .newTx()
  .setValidity({ from: now - 60_000n, to: now + 60_000n })
  .readFrom({ referenceInputs: [pythState] })
  .withdraw({
    amount: 0n,
    redeemer: [update],
    stakeCredential: ScriptHash.fromHex(pythScript),
  });

const builtTx = await tx.build();
const digest = await builtTx.signAndSubmit();
```

### 3. Transaction builder: Evolution SDK

Official recommended builder: `@evolution-sdk/evolution`

## Feed Availability

| Feed | ID | Status | Exponent | Notes |
|------|----|--------|----------|-------|
| **ADA/USD** | 16 | **Stable (live)** | -8 | 3 min publishers |
| **USD/ARS** | 2582 | **Coming soon** | -5 | 1 min publisher |
| USD/BRL | — | Stable (live) | — | |
| USD/MXN | — | Stable (live) | — | |

### Decision for MVP

**Use ADA/USD (feed 16)** for development and demo. When USD/ARS (feed 2582) goes live, switch by changing the feed ID. The on-chain logic is identical — only the feed ID and price interpretation change.

## Submission Requirements

- Fork `pyth-network/pyth-examples`
- Create directory: `lazer/cardano/factura-ya/`
- Include `README.md` with: team name, submission name, team members (with GitHub handles), contact email, project description, Pyth integration description
- Include source code in the directory
- Open PR with `cardano` tag, filling in the PR template (Hackathon Submission checkbox)
- **Deadline: 9pm (2026-03-22)**

### README template

```markdown
# Team {TeamName} Pythathon Submission

## Details

Team Name: {name}
Submission Name: Factura Ya
Team Members: {member1} (@github1), {member2} (@github2)
Contact: {email}

## Project Description

{description of the project and how it uses Pyth}
```

## Resolved Items

- ~~Cardano Policy ID~~ → **PreProd: `d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6`**
- ~~Off-chain SDK~~ → **`@pythnetwork/pyth-lazer-cardano-js`** provides `getPythState()` and `getPythScriptHash()`
- ~~Transaction builder~~ → **Evolution SDK** (`@evolution-sdk/evolution`)
- ~~`/lazer/cardano` directory~~ → Our submission creates `lazer/cardano/factura-ya/`

## Open Items

- **USD/ARS timeline**: Feed 2582 is "coming_soon" — no ETA.
- **API Key**: Need to get from judge's table.
