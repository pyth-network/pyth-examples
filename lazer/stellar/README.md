# Pyth Lazer Stellar Example Consumer

**⚠️ DISCLAIMER: This is an example implementation for demonstration purposes only. It has not been
audited and should be used at your own risk. Do not use this code in production without proper
security review and testing.**

A minimal Soroban contract that demonstrates the end-to-end [Pyth Lazer](https://docs.pyth.network/lazer)
integration on Stellar:

1. **Verify** a signed Lazer update via the deployed `pyth-lazer-stellar` verifier contract.
2. **Parse** the verified payload with the published
   [`pyth-lazer-stellar-sdk`](https://crates.io/crates/pyth-lazer-stellar-sdk).
3. **Freshness-check** the feed's update timestamp against a deployment-configured threshold, and
   reject any update whose timestamp is not strictly newer than the stored price (monotonic updates).
4. **Store / retrieve** the latest price for a single configured feed.

This is an example, not a production library — it tracks exactly one feed and keeps only the most
recent price. The main implementation lives in [`src/lib.rs`](./src/lib.rs).

The [`client/`](./client) directory holds a standalone Node client that drives the whole flow in one
command: it fetches a freshly signed update from Pyth Lazer, submits it to a deployed instance of
this contract, and reads the stored price back.

## Prerequisites

- A Rust toolchain (minimum **1.84**) with the `wasm32v1-none` target:
  ```bash
  rustup target add wasm32v1-none
  ```
- The [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli).
- Node.js 20 or newer, to run the demo client.
- A Pyth Lazer access token, exported as `PYTH_API_KEY`.

## Build

```bash
cargo build --release --target wasm32v1-none
```

The optimized contract is written to
`target/wasm32v1-none/release/pyth_lazer_stellar_example.wasm`.

## Deploy (testnet)

This example points at the **already-deployed** Pyth Lazer verifier — you do not deploy the verifier
yourself. It is live on both testnet and mainnet; the walkthrough below stays on testnet, so pass the
mainnet id as `--lazer` if you deploy there instead:

| Network | Pyth Lazer verifier |
| ------- | ------------------- |
| Testnet | [`CAYFT5JE3UQTKT4Q6ZOZK4FXVYVT6RE3MFC7STA4UB6WAEGBT65MRU52`](https://stellar.expert/explorer/testnet/contract/CAYFT5JE3UQTKT4Q6ZOZK4FXVYVT6RE3MFC7STA4UB6WAEGBT65MRU52) |
| Mainnet | [`CACZ3GBAKUPIAFRILUFO27J5RUH5GJ2VSJ46LP6GJYSKGDRTQ5MS3HCH`](https://stellar.expert/explorer/public/contract/CACZ3GBAKUPIAFRILUFO27J5RUH5GJ2VSJ46LP6GJYSKGDRTQ5MS3HCH) |

Configure a funded testnet identity once:

```bash
stellar keys generate deployer --network testnet --fund
```

Build and deploy the example, passing the constructor args (verifier address, feed id, freshness
threshold). Here: track BTC/USD (feed id 1) and reject updates older than 60 seconds:

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/pyth_lazer_stellar_example.wasm \
  --source deployer \
  --network testnet \
  -- \
  --lazer CAYFT5JE3UQTKT4Q6ZOZK4FXVYVT6RE3MFC7STA4UB6WAEGBT65MRU52 \
  --feed_id 1 \
  --freshness_threshold_us 60000000
```

The command prints the deployed contract id (`C...`). Export it:

```bash
export EXAMPLE_CONTRACT_ADDRESS=<deployed contract id>
```

## Run the demo client

The client fetches a signed update, calls `update_price`, and reads `get_price` back — one command,
no monorepo checkout required:

```bash
cd client
npm install
export PYTH_API_KEY=<your Pyth Lazer access token>
npm run demo -- --network testnet --contract-id "$EXAMPLE_CONTRACT_ADDRESS"
```

With no `--secret` and no `STELLAR_WALLET_SECRET`, the client generates a throwaway keypair and
friendbot-funds it on testnet. On mainnet a funded account is required:

```bash
export STELLAR_WALLET_SECRET=<S... secret key of a funded mainnet account>
npm run demo -- --network mainnet --contract-id "$EXAMPLE_CONTRACT_ADDRESS"
```

Run `npm run demo -- --help` for the full option list (`--feed-id`, `--channel`,
`--lazer-endpoint`, `--secret`).

See [`client/README.md`](./client/README.md) for the sample output and the failure modes.

## Invoking the contract directly

The client is the supported way to produce a payload, because the update has to be signed by Lazer
and fresh. If you want to drive the contract from the Stellar CLI instead, take the `Update hex`
line the client prints and pass it straight through — but note the payload goes stale within the
contract's `freshness_threshold_us`, so fetch and submit in the same breath:

```bash
UPDATE_HEX=$(curl -sS -X POST https://pyth-lazer-0.dourolabs.app/v1/latest_price \
  -H "Authorization: Bearer $PYTH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"priceFeedIds":[1],"properties":["price","exponent","feedUpdateTimestamp"],"formats":["leEcdsa"],"jsonBinaryEncoding":"hex","channel":"fixed_rate@200ms"}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["leEcdsa"]["data"])')

stellar contract invoke \
  --id "$EXAMPLE_CONTRACT_ADDRESS" \
  --source deployer \
  --network testnet \
  -- update_price --payload "$UPDATE_HEX"

stellar contract invoke \
  --id "$EXAMPLE_CONTRACT_ADDRESS" \
  --source deployer \
  --network testnet \
  -- get_price
```

`properties` must list `price`, `exponent` **and** `feedUpdateTimestamp`: `update_price` reads all
three, and a property that is not requested decodes to `None` on-chain, failing the call with
`PriceMissing` / `ExponentMissing` / `TimestampMissing`. `formats` must be `leEcdsa`, which is the
signature format the Soroban verifier accepts.

## Failure modes worth knowing

`update_price` is deliberately strict. The two you will hit while experimenting:

- **`PriceStale` (error #1)** — the update's feed timestamp lags ledger time by more than
  `freshness_threshold_us`. Fetch a new update.
- **`PriceOutdated` (error #9)** — the stored price is at least as new as the update you submitted.
  Updates are strictly monotonic, so **replaying a cached payload always fails**. Re-running the
  demo works because it fetches a fresh update every run.

The client maps these codes to a plain-English explanation before dumping the raw diagnostics.

## Additional Resources

- The Pyth Lazer consumer guide on [docs.pyth.network/lazer](https://docs.pyth.network/lazer).
- The [`pyth-lazer-stellar-sdk`](https://crates.io/crates/pyth-lazer-stellar-sdk) on crates.io.
