# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Synth Peso** — a synthetic ADA/USD asset on Cardano, using Pyth Lazer as the price oracle. Users mint synth tokens by depositing ADA (price determined by oracle), and burn synth tokens to reclaim the corresponding ADA from the pool.

## Repository layout

```
on-chain/       Aiken smart contracts (los-magnificos/synth-peso)
reference/      Original hackathon repo examples (entropy, lazer, price_feeds) — not used
```

## On-chain (Aiken)

All contract work happens inside `on-chain/`. Commands must be run from that directory.

```bash
cd on-chain
aiken check          # type-check + run all tests
aiken build          # compile to Plutus blueprints → plutus.json
aiken check -m foo   # run only tests matching pattern "foo"
aiken docs           # generate HTML documentation
```

### Dependencies (`aiken.toml`)
- `aiken-lang/stdlib v3.0.0`
- `pyth-network/pyth-lazer-cardano` (pinned commit `f78b676`) — Pyth Lazer on-chain SDK

### Pyth Lazer integration

The key entry point from `pyth-lazer-cardano`:

```aiken
use pyth.{get_updates, PriceUpdate, Feed}

let updates: List<PriceUpdate> = pyth.get_updates(pyth_policy_id, transaction)
```

`get_updates` requires:
- A **Pyth State NFT** reference input (PolicyId passed as parameter, token name `"Pyth State"`)
- Price messages submitted via the **withdraw script redeemer** as `List<ByteArray>` (handled by the oracle relayer, not our contract)

`get_updates` reads the Pyth redeemer internally via:
```aiken
pairs.get_first(tx.redeemers, Withdraw(Script(withdraw_script_hash)))
```
The redeemer form is `List<ByteArray>` — each `ByteArray` is a signed Pyth price message. The withdraw script verifies the Ed25519 signature on each message; by the time our validator runs, the price is already authenticated.

Each `ByteArray` message has the following binary structure (Solana wire format):
```
[4 bytes]  magic: b9011a82 (little-endian)
[64 bytes] Ed25519 signature
[32 bytes] public key
[2 bytes]  payload length (little-endian u16)
[N bytes]  payload
```

The payload itself is structured as:
```
[4 bytes]  magic: 75d3c793 (little-endian)
[8 bytes]  timestamp_us (little-endian u64)
[1 byte]   channel_id
[1 byte]   number of feeds
[...]      feeds (each: 4-byte feed_id + 1-byte property count + properties)
```

Each `Feed` contains:
- `feed_id: U32` — asset identifier (e.g., ADA/USD has a specific ID)
- `price: Option<Option<Int>>` — raw integer price (`Some(None)` = unavailable, `Some(Some(p))` = valid)
- `exponent: Option<Int>` — scale factor; real price = `price × 10^exponent`

### Protocol specification

**Mint (ADA → synth USD):**
- Off-chain: query Pyth Lazer API for ADA/USD price + signature; build tx with Pyth State as reference input + 0-withdrawal from Pyth verify script carrying the signed price bytes as redeemer
- On-chain inputs: pool UTxO (ADA collateral) + user's ADA
- On-chain outputs: minted synth tokens to user + new pool UTxO (with increased ADA)

**Burn (synth USD → ADA):**
- Off-chain: same oracle query + tx construction
- On-chain inputs: pool UTxO + user's synth tokens
- On-chain outputs: ADA returned to user + new pool UTxO (with decreased ADA)

**Key insight — no UTxO contention:** The Pyth State NFT UTxO is **never spent**. It is always a `reference_input`. The price update is pushed by the user as a withdrawal redeemer (`Withdraw(Script(pyth_withdraw_script))`). The withdraw script verifies the Ed25519 signature. Multiple users can mint/burn in the same block without contention.

### Architecture

Two validators run together in every mint/burn transaction:

1. **`mint` policy** — controls synth token supply; verifies oracle price and that the correct amount of synth tokens is minted/burned relative to ADA deposited/withdrawn
2. **`spend` validator** — guards the **pool UTxO** (ADA collateral); enforces the eUTxO state machine (pool UTxO must be spent and recreated with updated ADA balance)

The **Pyth State NFT** is a **reference input** (not spent) — the oracle relayer submits price messages via a withdraw script redeemer in the same transaction. The pool UTxO is what gets spent and recreated each time.

### Validator structure

`validators/synth-dolar.ak` — multi-validator with four compile-time parameters:

```aiken
validator synth_dolar(
  pyth_policy_id: PolicyId,     -- Pyth State NFT policy (testnet/mainnet differ)
  ada_usd_feed_id: Int,         -- 16 (ADA/USD on Pyth Lazer)
  collateral_ratio: Int,        -- e.g. 150 = 150% collateral requirement
  liquidation_threshold: Int,   -- e.g. 120 = liquidate when health drops below 120%
)
```

#### Types

```aiken
pub type PoolDatum {
  owner: ByteArray   -- pubkey hash of the position owner
}

pub type Action { Mint | Burn | Liquidate }
```

#### `mint` handler — controls synth token supply

**Mint:**
1. ADA delta (pool output − pool input) must be ≥ 1 lovelace
2. Collateralized ADA = `ada_deposited × collateral_ratio / 100`
3. `minted_amount == compute_expected_synth_amount(collateralized_ada, raw_price, exponent)`

**Burn:**
1. ADA withdrawal must be ≥ 1 lovelace
2. `minted_amount == -compute_expected_synth_amount(ada_withdrawn, raw_price, exponent)`
3. Health after withdrawal ≥ `liquidation_threshold` (position must stay solvent)
4. Transaction must be signed by `PoolDatum.owner`

**Liquidate:**
1. ADA withdrawal must be ≥ 1 lovelace
2. Same burn math as Burn
3. Health after withdrawal < `liquidation_threshold` (position must be unhealthy)
4. No owner signature required — anyone can liquidate

#### `spend` handler — guards pool UTxO

Delegates all validation to the `mint` policy. Only checks that the mint policy is running in the same transaction (`get_minted_amount(mint, policy_id) != 0`). The `policy_id` is derived from the spent UTxO's script address.

#### `else` handler

`fail` — rejects all other script purposes (staking, governance, etc.)

#### Helper functions (below validator)

| Function | Purpose |
|---|---|
| `get_ada_usd_price` | Fetches `(raw_price, exponent)` from Pyth Lazer via `get_updates` |
| `get_ada_delta` | Returns `output_lovelace - input_lovelace` for the pool UTxO |
| `get_pool_ada` | Returns current lovelace balance of the pool input UTxO |
| `get_minted_amount` | Sums all token quantities minted/burned under a policy |

#### Price formula

```
synth_micro = ada_lovelaces × raw_price / 10^8
```
(ADA/USD exponent = −8; synth tokens have 6 decimals like ADA lovelaces)

### Plutus version
Plutus v3 — use `ScriptContext` patterns accordingly.

## Frontend (TypeScript / MeshSDK)

Located in `frontend/src/tx/`. Uses MeshSDK v1.9.0-beta + Blockfrost as provider (preprod).

### Key files

| File | Purpose |
|---|---|
| `contract.ts` | All shared constants: script CBOR, protocol params, Pyth addresses, amount helpers |
| `mint.ts` | `buildMintTx` — deposit ADA, mint synth tokens |
| `burn.ts` | `buildBurnTx` — burn synth tokens, reclaim ADA |
| `liquidate.ts` | `buildLiquidateTx` — permissionless liquidation of undercollateralised positions |

### Important: script CBOR encoding

Aiken's `plutus.json` outputs `compiledCode` in **single-CBOR** encoding. MeshSDK's `applyParamsToScript` requires **double-CBOR** encoding. Always wrap with `applyCborEncoding` before passing to `applyParamsToScript`:

```typescript
const UNPARAMETERISED_SCRIPT_CBOR = applyCborEncoding(RAW_COMPILED_CODE);
```

This is already done in `contract.ts` — do not remove it.

### Script address derivation

```typescript
const scriptCbor = applyParamsToScript(UNPARAMETERISED_SCRIPT_CBOR, [
  PARAMS.PYTH_POLICY_ID,
  PARAMS.ADA_USD_FEED_ID,
  PARAMS.COLLATERAL_RATIO,
  PARAMS.LIQUIDATION_THRESHOLD,
]);
const poolAddress = serializePlutusScript({ code: scriptCbor, version: "V3" }, undefined, 0).address;
const scriptHash  = resolvePlutusScriptHash(poolAddress); // also the minting policy ID
```

Known derived values (preprod):
- `poolAddress` → `addr_test1wqkhsggq87fndzsll52yp6rm9aw6jw9hhpaenjzxag0xazq3wlxky`
- `scriptHash`  → `2d7821003f93368a1ffd1440e87b2f5da938b7b87b99c846ea1e6e88`

### Known preprod constants (`contract.ts`)

```typescript
PARAMS.PYTH_POLICY_ID  = "d799d287105dea9377cdf9ea8502a83d2b9eb2d2050a8aea800a21e6"
PARAMS.ADA_USD_FEED_ID = 16
PARAMS.COLLATERAL_RATIO        = 150
PARAMS.LIQUIDATION_THRESHOLD   = 120

PYTH.STATE_ADDRESS    = "addr_test1wrm3tr5zpw9k2nefjtsz66wfzn6flnphr5kd6ak9ufrl3wcqqfyn8"
PYTH.STATE_ASSET_NAME = "50797468205374617465"  // hex("Pyth State")
// Asset fingerprint: asset1kjr4k3m0xe5c747n6yv2s9dlfhkmzgceqs82jy (verified via CIP-14)

PYTH.WITHDRAW_SCRIPT_CBOR = "TODO"  // Pyth verify script — get from Pyth team
PYTH.WITHDRAW_ADDRESS     = "TODO"  // reward address of the verify script
```

### Mesh "Data" format for redeemers/datums

In MeshSDK's "Mesh" encoding (used with `"Mesh"` flag on builder calls):
- `ByteArray` → plain hex string
- `List<T>` → JS array `[...]`
- `Constr(N, fields)` → `mConStr0([...])` / `mConStr1([...])` / `mConStr2([...])` from `@meshsdk/core`

Do **not** use `mBytes` or `mList` — they are not exported by `@meshsdk/core`. Use hex strings and arrays directly.

### Redeemer mapping

| Action | Spend redeemer | Mint redeemer |
|---|---|---|
| Mint | `mConStr0([])` | `mConStr0([])` |
| Burn | `mConStr1([])` | `mConStr1([])` |
| Liquidate | `mConStr2([])` | `mConStr2([])` |

Pyth withdrawal redeemer: `[pythHex]` — a JS array containing the hex-encoded Solana wire format price message returned by the backend as `solanaPayload`.

### Pyth price message (`pythHex` / `solanaPayload`)

The backend (`/price` endpoint) returns `solanaPayload` — a hex string of the Solana wire format signed price message:

```
[4 bytes]  magic:          b9 01 1a 82
[64 bytes] Ed25519 signature
[32 bytes] public key
[2 bytes]  payload length (u16 LE)
[4 bytes]  payload magic:  75 d3 c7 93
[8 bytes]  timestamp_us (u64 LE)
[1 byte]   channel_id
[1 byte]   feed count
[4 bytes]  feed_id = 16 (ADA/USD, u32 LE)
[...]      properties: Price (i64 LE), Exponent (i16 LE), ...
```

This is passed as the withdrawal redeemer to the Pyth verify script, which validates the Ed25519 signature before our validator runs.

### Amount helpers

```typescript
// Synth to mint for a given ADA deposit
computeMintAmount(lovelaces, price) = (lovelaces × rawPrice / 1e8) × 100 / collateralRatio

// ADA to return when burning synth
computeBurnReturn(synthMicro, price) = synthMicro × 1e8 / rawPrice
```

Where `rawPrice = Math.round(price * 1e8)` (price is the float ADA/USD value).
