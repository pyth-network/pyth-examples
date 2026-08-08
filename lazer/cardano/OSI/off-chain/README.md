# off-chain

To install dependencies:

```bash
bun install
```

Minimal e2e commands:

```bash
bun run create-validator-utxo
bun run add-fund-validator-utxo <lovelace> [outRef]
bun run spend-validator-utxo <createTxHash>
bun run evaluate-ogmios <txCborHex>
bun run fetch-ada-usdt-update
```

You can also pass an explicit out-ref as `<createTxHash>#<index>`.

### Fund Operation

Add funds to an existing OSI UTxO while preserving the deadline and payees:

```bash
# Add 1000000 lovelace to the first validator UTxO
bun run add-fund-validator-utxo 1000000

# Add 2000000 lovelace to a specific UTxO
bun run add-fund-validator-utxo 2000000 <txHash>#<index>
```

The Fund operation:
- Takes an existing OSI UTxO from the script address
- Adds additional ADA (lovelace) from your wallet
- Returns the combined funds to the same script address with the original datum unchanged
- Preserves the deadline and payees for later Payout operations

Required environment variables:

- `NETWORK` = `preprod`, `preview`, or `mainnet`
- `WALLET_MNEMONIC`
- `PYTH_POLICY_ID`
- `LAZER_TOKEN`
- `VALIDATOR_LOVELACE` (defaults to `5000000`)
- provider config:
  - `PROVIDER_TYPE=blockfrost` with `BLOCKFROST_BASE_URL` and `BLOCKFROST_PROJECT_ID`
  - or `PROVIDER_TYPE=kupmios` with `KUPO_URL` and `OGMIOS_URL`
  - or `PROVIDER_TYPE=maestro` with `MAESTRO_BASE_URL` and `MAESTRO_API_KEY`
  - or `PROVIDER_TYPE=koios` with `KOIOS_BASE_URL` and optional `KOIOS_TOKEN`
