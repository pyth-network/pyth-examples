# Pyth Lazer Stellar demo client

A standalone Node client for the [example consumer contract](../README.md). One command runs the
whole consumer story:

1. Fetch a freshly signed Pyth Lazer price update over REST, carrying the three properties the
   contract needs (`price`, `exponent`, `feedUpdateTimestamp`).
2. Print the update hex and the off-chain price, for comparison.
3. Submit it to the deployed example consumer's `update_price`.
4. Read `get_price` back and print the stored price in human units.

It depends only on `@stellar/stellar-sdk` and talks to Lazer with plain `fetch`, so it runs outside
the Pyth monorepos.

## Usage

```bash
npm install
export PYTH_API_KEY=<your Pyth Lazer access token>
npm run demo -- --network testnet --contract-id <EXAMPLE_CONTRACT_ADDRESS>
```

Deploy the example consumer first — see the [parent README](../README.md).

| Option             | Default                                              | Notes                                               |
| ------------------ | ---------------------------------------------------- | --------------------------------------------------- |
| `--contract-id`    | _required_                                           | Deployed example consumer contract id.              |
| `--network`        | `testnet`                                            | `testnet` or `mainnet`.                             |
| `--secret`         | `$STELLAR_WALLET_SECRET`                             | Stellar secret key. Required on mainnet.            |
| `--feed-id`        | `1` (BTC/USD)                                        | Must match the feed the contract was deployed with. |
| `--channel`        | `fixed_rate@200ms`                                   | Lazer channel.                                      |
| `--lazer-endpoint` | `https://pyth-lazer-0.dourolabs.app/v1/latest_price` | Lazer `latest_price` REST endpoint.                 |

On testnet, an account that is missing or unfunded is topped up from friendbot automatically — with
no secret at all the client generates a throwaway keypair. Mainnet has no friendbot, so
`STELLAR_WALLET_SECRET` (or `--secret`) must hold a funded account. The client prints the signing
account's public key and XLM balance before it spends anything.

On mainnet the client bids an inclusion fee of `1000000` stroops (0.1 XLM). Mainnet ledgers run
close to full and a base-fee bid gets evicted, so the transaction would expire without ever reaching
a ledger.

## Sample output

```
=== Pyth Lazer Stellar demo (testnet) ===
  Example consumer: CCEZSNTTVRIYXYHBKD2OMBRQI3RP6ZNXFWQ5ZG5ZDTQ7JZ4DTZ6FR72Q
  Explorer:         https://stellar.expert/explorer/testnet/contract/CCEZSNTTVRIYXYHBKD2OMBRQI3RP6ZNXFWQ5ZG5ZDTQ7JZ4DTZ6FR72Q

=== Signing account (from --secret / $STELLAR_WALLET_SECRET) ===
  Public key: GBTKQ2WYNYE5TJW3N5LH7PGGERX2EIBDIIN7X6LFHMVQQZCZT36KA3PC
  XLM balance: 9999.9995630

=== Fetching signed Lazer update (feed 1, fixed_rate@200ms) ===
  Update size: 112 bytes
  Update hex:  e4bd474d77cb5c62...c04301cd995b0600
  Off-chain price: 75549.21621105 (raw 7554921621105, exponent -8)
  Feed timestamp:  1789565987800000 us (2026-09-16T13:39:47.800Z)

=== Submitting update_price to the example consumer ===
  Transaction hash: 10c8e82aed30bfb2f3de6848f8729c4288a2c0e791fc280299700070682ffcb9
  Explorer:         https://stellar.expert/explorer/testnet/tx/10c8e82aed30bfb2f3de6848f8729c4288a2c0e791fc280299700070682ffcb9
  Status:           SUCCESS (ledger 4708481)

=== Reading get_price back from the contract ===
  Stored price:   75549.21621105
  Raw price:      7554921621105 (exponent -8)
  Feed timestamp: 1789565987800000 us (2026-09-16T13:39:47.800Z)

✅ Demo complete.
```

## Failure modes

The client decodes the contract's error codes and leads with what they mean:

- **`PriceStale` (#1)** — the update lagged ledger time by more than the contract's
  `freshness_threshold_us`. Fetch a new update.
- **`PriceOutdated` (#9)** — the stored price is at least as new as this update. `update_price` is
  strictly monotonic, so a replayed payload always fails. The client fetches a fresh update on every
  run, so re-running is safe.
- **`FeedMissing` (#2)** — `--feed-id` does not match the feed the contract was deployed with.
- **`TimestampMissing` / `PriceMissing` / `ExponentMissing` (#3 / #4 / #5)** — a required property
  was absent from the payload. The client always requests all three, so this only shows up against
  a payload produced elsewhere.

## Development

```bash
npm run test        # prettier --check + tsc --noEmit
npm run fix:format  # prettier --write
```
