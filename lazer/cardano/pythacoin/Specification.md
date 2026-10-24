# Pythacoin – synthetic CDP-based stablecoin using Pyth ADA/USD price oracle

## Project Overview

Pythacoin – synthetic CDP-based stablecoin using Pyth oracles network for ADA/USD price oracle.
It's a project for Pythaton – Pyth hackathon.

## Context

- https://pyth.network
- https://docs.pyth.network/price-feeds/pro/integrate-as-consumer/cardano
- https://github.com/pyth-network/pyth-examples

We'll use Cardano Preprod for running the demo.
Read `.env` file for `BLOCKFROST_API_KEY` and `PYTH_KEY` (Pyth Lazer access token).
Use Scalus for DApp development.
Use Emulator for testing.
Package name: `pythacoin`.

## Architecture

### Combined Validator (mint + spend)

A single Plutus V3 combined validator handles both spending (CDP logic) and minting (PUSD + CDP NFT).
The same script hash serves as both the CDP script address and the PUSD/NFT policy ID.

**Token names under the combined policy ID:**
- `"PUSD"` – the stablecoin token
- Unique per-CDP token name (e.g., derived from UTxO being consumed) – the CDP NFT

### CDP Datum

```
CdpDatum:
  owner: PubKeyHash    -- who owns this CDP
  debt:  Integer        -- PUSD amount minted against this CDP
```

Collateral is the ADA value in the UTxO (not stored in datum).

### LTV Calculation

```
LTV = debt / (collateral_ada * ada_usd_price)
```

- **Max minting LTV**: 95% – Alice can mint/borrow PUSD up to 95% LTV
- **Liquidation threshold**: 90% – when LTV > 90%, anyone can liquidate

This is intentional for the demo: Alice opens a CDP, increases LTV above 90%, and Bob liquidates her.

### CDP NFT

Each CDP UTxO contains a unique NFT (minted under the combined policy ID) to:
- Uniquely identify the CDP
- Prevent double-satisfaction attacks

No receipt NFT for the user. Ownership is verified by checking the transaction is signed
by the `owner` PubKeyHash from the datum.

## Smart Contract – Spend (CDP Actions)

### Open CDP
- Consumes a UTxO to derive unique CDP NFT token name
- Mints 1 CDP NFT (unique token name) under the combined policy
- Optionally mints PUSD (if borrowing at open time)
- Creates CDP UTxO at script address with:
  - Value: locked ADA + CDP NFT
  - Datum: `CdpDatum(owner, debt)`
- Validates: LTV <= 95% (if minting PUSD), tx signed by owner

### Borrow (mint more PUSD)
- Spends existing CDP UTxO
- Mints additional PUSD
- Creates new CDP UTxO with updated debt
- Validates: tx signed by owner, new LTV <= 95%

### Repay (burn PUSD)
- Spends existing CDP UTxO
- Burns PUSD
- Creates new CDP UTxO with reduced debt
- Optionally withdraws excess ADA collateral
- Validates: tx signed by owner, new LTV <= 95% (if withdrawing collateral)

### Close CDP
- Spends CDP UTxO
- Burns all remaining PUSD debt
- Burns CDP NFT
- Returns all ADA collateral to owner
- Validates: tx signed by owner, debt fully repaid

### Liquidate CDP
- Spends CDP UTxO
- Burns PUSD equal to the CDP's debt
- Burns CDP NFT
- Sends full ADA collateral to liquidator
- Validates: LTV > 90% (using Pyth oracle price), debt fully covered
- Anyone can liquidate (no owner signature required)

## Smart Contract – Mint (PUSD + CDP NFT)

The mint leg of the combined validator checks:

**For PUSD (token name `"PUSD"`):**
- The corresponding CDP spend action is present in the same transaction
- The mint/burn amount is consistent with the CDP datum changes

**For CDP NFT (unique token name):**
- Exactly 1 NFT minted on open (and the token name matches the derived unique ID)
- Exactly 1 NFT burned on close/liquidate

## Pyth Oracle Integration

Full on-chain Pyth Lazer verification implemented in Scalus.
Reference Aiken implementation: `pyth-network/pyth-lazer-cardano` (GitHub).
Reference JS SDK: `@pythnetwork/pyth-lazer-cardano-js` (in `pyth-crosschain` repo).

### On-Chain Architecture

The Pyth Lazer system uses a **withdrawal script pattern**:

1. A **Pyth State UTxO** holds an NFT (token name `"Pyth State"` under `pyth_id` policy) with an
   inline datum:
   ```
   Pyth:
     governance: Governance
     trusted_signers: Pairs<VerificationKey, ValidityRange>
     deprecated_withdraw_scripts: Pairs<ValidityRange, ScriptHash>
     withdraw_script: ScriptHash
   ```
2. The **Pyth withdraw script** (identified by `withdraw_script` hash from the state datum)
   verifies Ed25519 signatures on price updates and checks signers are in `trusted_signers`.
3. **Our CDP validator** reads the already-verified price updates from the withdrawal redeemer
   (no need to re-verify signatures in our script).

### Transaction Structure

For any CDP action requiring a price (open with borrow, borrow, liquidate):

1. Include the **Pyth State UTxO as a reference input**
2. Include a **zero-withdrawal** (`0 lovelace`) from the Pyth withdraw script
3. Pass the **signed price update bytes as the withdrawal redeemer** (`List<ByteArray>`)
4. Include our CDP validator spend/mint in the same transaction
5. Set a **short validity window** (e.g., ±60 seconds) for price freshness

### Signed Price Update Binary Format ("Solana" format)

Fetched off-chain via `PythLazerClient` with `formats: ["solana"]`:

| Offset | Size     | Field     | Description                              |
|--------|----------|-----------|------------------------------------------|
| 0      | 4 bytes  | magic     | `0xb9011a82` (LE)                        |
| 4      | 64 bytes | signature | Ed25519 signature over the payload       |
| 68     | 32 bytes | key       | Ed25519 public key of the signer         |
| 100    | 2 bytes  | size      | U16 LE – payload length                  |
| 102    | `size`   | payload   | Price update payload                     |

### Price Update Payload Format

| Offset | Size     | Field        | Description                          |
|--------|----------|--------------|--------------------------------------|
| 0      | 4 bytes  | magic        | `0x75d3c793` (LE)                    |
| 4      | 8 bytes  | timestamp_us | U64 LE – timestamp in microseconds   |
| 12     | 1 byte   | channel_id   | U8 – channel identifier              |
| 13     | 1 byte   | feeds_len    | U8 – number of feeds                 |
| 14+    | variable | feeds        | Array of Feed structures             |

Each **Feed**: `feed_id` (U32 LE) + `properties_len` (U8) + properties.
Each **Property**: `property_id` (U8) + type-specific data:

| ID | Name              | Format                         |
|----|-------------------|--------------------------------|
| 0  | Price             | I64 LE (0 = None)              |
| 4  | Exponent          | I16 LE                         |

(Other properties: BestBidPrice(1), BestAskPrice(2), PublisherCount(3), Confidence(5), etc.)

### On-Chain Price Reading (Scalus implementation)

Our validator needs to:
1. Find the Pyth State UTxO in `tx.referenceInputs` by looking for the `"Pyth State"` NFT
2. Extract `withdraw_script` hash from the inline datum
3. Find the withdrawal redeemer for that script hash in `tx.redeemers`
4. Parse each `ByteArray` in the redeemer list as a signed message (skip magic+signature+key, read payload)
5. Parse the payload to extract feeds, find feed ID 16 (ADA/USD)
6. Extract `price` and `exponent`, compute: `ada_usd_price = price * 10^exponent`

Note: **Signature verification is done by the Pyth withdraw script**, not by our validator.
We only parse the payload to extract the price. The Plutus V3 builtin `verifyEd25519Signature`
is used by the Pyth withdraw script.

### Off-Chain Price Fetching

The backend fetches prices using the Pyth Lazer SDK:
```typescript
const lazer = await PythLazerClient.create({ token: PYTH_KEY });
const latestPrice = await lazer.getLatestPrice({
  channel: "fixed_rate@200ms",
  formats: ["solana"],
  jsonBinaryEncoding: "hex",
  priceFeedIds: [16],           // ADA/USD
  properties: ["price", "exponent"],
});
const update = Buffer.from(latestPrice.solana.data, "hex");
```

The `PYTH_KEY` is the Pyth Lazer access token from `.env`.

### Key Parameters
- **ADA/USD feed ID**: 16
- **pyth_id**: Pyth deployment policy ID (network-specific, passed as validator parameter)
- **Pyth State NFT token name**: `"Pyth State"` (UTF-8 encoded)

Required for: Open (if minting PUSD), Borrow, Liquidate – any action that needs current price.

## Backend API

REST API returning unsigned transaction CBOR (hex) for wallet signing.
Built with Tapir. Swagger UI at `/docs`.

### Transaction Building Endpoints

| Endpoint              | Method | Description                                    |
|-----------------------|--------|------------------------------------------------|
| `/cdp/open`           | POST   | Build tx: lock ADA, mint CDP NFT, optionally mint PUSD |
| `/cdp/borrow`         | POST   | Build tx: mint more PUSD against existing CDP  |
| `/cdp/repay`          | POST   | Build tx: burn PUSD, reduce debt               |
| `/cdp/close`          | POST   | Build tx: repay all, burn NFT, reclaim ADA     |
| `/cdp/liquidate`      | POST   | Build tx: liquidate unhealthy CDP              |

All tx endpoints return unsigned transaction CBOR hex for the frontend wallet to sign and submit.

### Query Endpoints

| Endpoint              | Method | Description                                    |
|-----------------------|--------|------------------------------------------------|
| `/cdp/{nft-token-name}` | GET  | CDP details: collateral, debt, LTV, health     |
| `/cdps`               | GET    | List all CDPs (filterable by owner)            |
| `/price`              | GET    | Current ADA/USD price from Pyth                |

## Tests

Use Scalus Emulator to run tests.

### Unit Tests
- Open CDP with collateral
- Borrow PUSD up to 95% LTV (should succeed)
- Borrow PUSD beyond 95% LTV (should fail)
- Repay PUSD
- Close CDP
- Liquidate CDP when LTV > 90% (should succeed)
- Liquidate CDP when LTV <= 90% (should fail)

### Demo Scenario Test
1. Alice opens CDP with ADA collateral
2. Alice borrows PUSD, LTV is ~85%
3. Alice borrows more PUSD, pushing LTV above 90%
4. Bob liquidates Alice's CDP – receives ADA, burns PUSD
5. Verify Alice's CDP is gone, Bob has the ADA

## Frontend

Single-page React/TypeScript app. Minimalistic, clean design.
Located in `/frontend` directory (monorepo).

### Tech Stack
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** – utility-first styling, minimalist aesthetic
- **cardano-connect** – CIP-30 wallet connection (Nami, Eternl, Lace, etc.)
- **react-query** – data fetching, polling, caching for CDP/price data

### Layout

Single page with a top bar and a main content area. No routing needed.

```
┌─────────────────────────────────────────────────┐
│  Pythacoin          ADA/USD: $0.42    [Connect]  │  ← top bar
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  Open CDP                                    │ │  ← open CDP form
│  │  Collateral: [___] ADA   Borrow: [___] PUSD  │ │    (visible when wallet connected)
│  │  LTV preview: 82%              [Open CDP]    │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  Your CDPs                                        │  ← user's CDPs section
│  ┌─────────────────────────────────────────────┐ │
│  │  CDP #a1b2  │ 500 ADA │ 180 PUSD │ LTV 85% │ │
│  │  [Borrow] [Repay] [Close]                    │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  All CDPs                                         │  ← global CDP list
│  ┌─────────────────────────────────────────────┐ │
│  │  Owner     │ Collateral │ Debt  │ LTV  │     │ │
│  │  addr1...  │ 500 ADA    │ 420   │ 92%  │ [L] │ │  ← [L] = Liquidate button
│  │  addr1...  │ 1000 ADA   │ 300   │ 71%  │     │ │    (shown when LTV > 90%)
│  └─────────────────────────────────────────────┘ │
│                                                   │
└─────────────────────────────────────────────────┘
```

### Top Bar
- **Logo/title**: "Pythacoin"
- **ADA/USD price**: live price from `/price` endpoint, auto-refreshes
- **Connect wallet** button: uses cardano-connect for CIP-30 wallet selection
- Shows connected wallet address (truncated) when connected

### Open CDP Form
- Visible only when wallet is connected
- Inputs: collateral amount (ADA), borrow amount (PUSD)
- Live LTV preview calculated from inputs and current price
- LTV color: green (<70%), yellow (70-85%), orange (85-90%), red (>90%)
- "Open CDP" button: calls `POST /cdp/open`, gets unsigned tx, sends to wallet for signing

### Your CDPs Section
- Visible only when wallet is connected
- Shows CDPs owned by connected wallet (filtered from `/cdps?owner=...`)
- Each CDP card shows: NFT ID (short), collateral (ADA), debt (PUSD), current LTV
- LTV color coding same as above
- Action buttons per CDP:
  - **Borrow**: dialog/inline input for additional PUSD amount, shows new LTV preview
  - **Repay**: dialog/inline input for PUSD amount to repay, shows new LTV preview
  - **Close**: confirms, then builds close tx (must have enough PUSD to cover debt)

### All CDPs Table
- Always visible (even without wallet)
- Lists all CDPs from `/cdps` endpoint
- Columns: owner (truncated address), collateral, debt, LTV
- **Liquidate** button shown on CDPs with LTV > 90%
- Liquidate: builds liquidate tx, sends to wallet (liquidator must hold enough PUSD)
- Auto-refreshes every ~10 seconds

### Interaction Flow
1. User clicks "Connect Wallet" → cardano-connect modal → selects wallet
2. App reads wallet address, fetches user's CDPs and all CDPs
3. User fills Open CDP form → clicks "Open CDP"
4. Frontend calls `POST /cdp/open` with params → backend returns unsigned tx CBOR hex
5. Frontend submits CBOR to wallet via CIP-30 `signTx()` → wallet prompts user
6. User signs → frontend submits signed tx via CIP-30 `submitTx()`
7. UI refreshes CDP list after confirmation

### Design Notes
- Dark theme, monospace accents for numbers/hashes
- Muted color palette with accent color for CTAs
- Subtle card borders, generous whitespace
- No unnecessary animations – clean, functional DeFi aesthetic
- Responsive: works on desktop, passable on mobile

## Agents Workflow

Multiple Claude Code agents work in parallel on different components.
The orchestrator agent coordinates work, resolves cross-cutting concerns, and merges results.

### Agent Topology

```
Orchestrator (main Claude Code session)
  ├── Agent 1: Smart Contract     ← on-chain Scalus code
  ├── Agent 2: Backend API        ← off-chain tx building, REST API
  ├── Agent 3: Tests              ← emulator tests
  └── Agent 4: Frontend           ← React/TypeScript UI
```

### Agent 1: Smart Contract

**Scope**: `src/main/scala/pythacoin/` – on-chain validators

**Tasks**:
1. Rename package from `starter` to `pythacoin`
2. Define on-chain data types: `CdpDatum`, `CdpRedeemer` (Open/Borrow/Repay/Close/Liquidate)
3. Implement Pyth price parsing in Scalus (port from Aiken `pyth-lazer-cardano`):
   - Parse signed message envelope (skip magic+sig+key, extract payload)
   - Parse price update payload (magic, timestamp, feeds)
   - Extract ADA/USD price (feed ID 16) with exponent
4. Implement combined validator `@Compile object CdpValidator`:
   - `spend`: validate CDP actions (open, borrow, repay, close, liquidate)
   - `mint`: validate PUSD minting/burning and CDP NFT minting/burning
5. Implement LTV checks (95% max mint, 90% liquidation threshold)
6. Off-chain contract compilation (`CdpContract` object, like `MintingPolicyContract`)

**Depends on**: Nothing (can start immediately)
**Blocks**: Agent 2, Agent 3

### Agent 2: Backend API

**Scope**: `src/main/scala/pythacoin/` – off-chain tx building, REST server

**Tasks**:
1. Update `AppCtx` for CDP context (Pyth config, CDP script, PUSD policy ID)
2. Add Pyth price fetching (use `PythLazerClient` via HTTP/WebSocket, `PYTH_KEY` from `.env`)
3. Build transaction constructors for each CDP action:
   - `openCdp(collateralAda, borrowPusd, ownerAddr)` → unsigned tx CBOR
   - `borrowPusd(cdpNftId, amount, ownerAddr)` → unsigned tx CBOR
   - `repayPusd(cdpNftId, amount, ownerAddr)` → unsigned tx CBOR
   - `closeCdp(cdpNftId, ownerAddr)` → unsigned tx CBOR
   - `liquidateCdp(cdpNftId, liquidatorAddr)` → unsigned tx CBOR
4. Each tx builder: fetches current Pyth price, includes Pyth reference input + zero-withdrawal
5. Implement query functions: list CDPs (scan script UTxOs), get CDP by NFT, get price
6. Define Tapir REST endpoints (POST for tx building, GET for queries)
7. Update `Server` and `Main` entry points

**Depends on**: Agent 1 (needs compiled validator, data types)
**Blocks**: Agent 4

### Agent 3: Tests

**Scope**: `src/test/scala/pythacoin/`

**Tasks**:
1. Set up emulator test base with mock Pyth oracle:
   - Create a mock Pyth State UTxO with test trusted signers
   - Generate signed price updates with known test keys
   - Set up the mock Pyth withdraw script (or use a simple always-succeeds for testing)
2. Unit tests for each CDP action:
   - Open CDP with collateral (success)
   - Open CDP and borrow PUSD at 85% LTV (success)
   - Borrow up to 95% LTV (success)
   - Borrow beyond 95% LTV (failure)
   - Repay PUSD (success)
   - Close CDP – full repayment (success)
   - Liquidate when LTV > 90% (success)
   - Liquidate when LTV <= 90% (failure)
3. Demo scenario test (Alice & Bob)
4. Edge cases: zero borrow, exact threshold values, multiple CDPs

**Depends on**: Agent 1 (needs compiled validator)
**Can run in parallel with**: Agent 2

### Agent 4: Frontend

**Scope**: `frontend/`

**Tasks**:
1. Scaffold Vite + React 19 + TypeScript project
2. Install and configure Tailwind CSS (dark theme)
3. Set up cardano-connect for CIP-30 wallet integration
4. Set up react-query for data fetching with polling
5. Implement API client (typed fetch wrappers for all backend endpoints)
6. Build components:
   - `TopBar` – logo, price display, wallet connect button
   - `OpenCdpForm` – collateral/borrow inputs, LTV preview
   - `YourCdps` – user's CDP cards with action buttons
   - `AllCdpsTable` – global CDP list with liquidate buttons
   - `LtvBadge` – color-coded LTV display
7. Wire up transaction flow: API call → CIP-30 `signTx` → `submitTx` → refresh
8. Styling: dark theme, monospace numbers, clean DeFi aesthetic

**Depends on**: Agent 2 (needs API contract/types for the client)
**Can start early**: scaffolding, component shells, mock data

### Execution Plan

**Phase 1** (parallel):
- Agent 1 starts smart contract development
- Agent 4 starts frontend scaffolding with mock data

**Phase 2** (after Agent 1 delivers compiled validator):
- Agent 2 starts backend API
- Agent 3 starts emulator tests
- Agent 4 continues with component development

**Phase 3** (after Agent 2 delivers API):
- Agent 4 wires up real API calls
- Agent 3 adds integration tests

**Phase 4** (all agents):
- Integration testing end-to-end
- Bug fixes and polish
