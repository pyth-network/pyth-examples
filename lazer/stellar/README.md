# Pyth Lazer Stellar Example Consumer

**⚠️ DISCLAIMER: This is an example implementation for demonstration purposes only. It has not been
audited and should be used at your own risk. Do not use this code in production without proper
security review and testing.**

A minimal Soroban contract that demonstrates the end-to-end [Pyth Lazer](https://docs.pyth.network/lazer)
integration on Stellar:

1. **Verify** a signed Lazer update via the deployed `pyth-lazer-stellar` verifier contract.
2. **Parse** the verified payload with the published
   [`pyth-lazer-stellar-sdk`](https://crates.io/crates/pyth-lazer-stellar-sdk).
3. **Freshness-check** the feed's update timestamp against a deployment-configured threshold.
4. **Store / retrieve** the latest price for a single configured feed.

This is an example, not a production library — it tracks exactly one feed and keeps only the most
recent price. The main implementation lives in [`src/lib.rs`](./src/lib.rs).

## Prerequisites

- A Rust toolchain (minimum **1.84**) with the `wasm32v1-none` target:
  ```bash
  rustup target add wasm32v1-none
  ```
- The [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli).

## Build

```bash
cargo build --release --target wasm32v1-none
```

The optimized contract is written to
`target/wasm32v1-none/release/pyth_lazer_stellar_example.wasm`.

## Deploy (testnet)

This example points at the **already-deployed** Pyth Lazer verifier on Stellar testnet — you do not
deploy the verifier yourself:

| Contract | Testnet address |
| -------- | --------------- |
| Pyth Lazer verifier | `CAYFT5JE3UQTKT4Q6ZOZK4FXVYVT6RE3MFC7STA4UB6WAEGBT65MRU52` |

Configure a funded testnet identity once:

```bash
stellar keys generate deployer --network testnet
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

Then submit a signed Lazer update and read it back:

```bash
stellar contract invoke \
  --id <EXAMPLE_CONTRACT_ADDRESS> \
  --source deployer \
  --network testnet \
  -- update_price --payload <HEX_ENCODED_UPDATE>

stellar contract invoke \
  --id <EXAMPLE_CONTRACT_ADDRESS> \
  --source deployer \
  --network testnet \
  -- get_price
```

## Additional Resources

- The Pyth Lazer consumer guide on [docs.pyth.network/lazer](https://docs.pyth.network/lazer).
- The [`pyth-lazer-stellar-sdk`](https://crates.io/crates/pyth-lazer-stellar-sdk) on crates.io.
