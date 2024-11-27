# send_usd

Sample contract demonstrating Pyth price feed integration on TON.

## Overview

This contract enables USD-denominated payments on TON by integrating with Pyth price oracles. It supports two operations:

1. `send_usd` - Send a USD-denominated payment that gets converted to TON at current price

Message format:

```typescript
{
    queryId: number,     // 64-bit unique identifier for the request
    recipient: Address,  // TON address of payment recipient
    usdAmount: number,  // Amount in USD dollars
    updateData: Buffer, // Pyth price update data (converted to cell chain)
    value: bigint      // Amount of TON to attach to message
}
```

The `updateData` field contains Pyth price feed data and must be obtained from [Hermes](https://hermes.pyth.network/docs/). This data is converted to a TON cell chain format using the `createCellChain()` helper from the [pyth-ton-js](https://www.npmjs.com/package/@pythnetwork/pyth-ton-js) library. The Pyth contract can be found [here](https://github.com/pyth-network/pyth-crosschain/tree/main/target_chains/ton/contracts).

2. Pyth price update callback

-   Receives price updates from Pyth oracle contract
-   Automatically processes pending USD payments using latest price

## Setup

1.  Copy environment config:

```bash
cp .env.example .env
```

2.  Configure `.env`:

```
WALLET_MNEMONIC="your mnemonic here"
```

## Usage

1.  Deploy contract:

```bash
npx blueprint run deploySendUsd --custom https://testnet.toncenter.com/api/v2/jsonRPC --custom-version v2 --custom-type testnet --custom-key <YOUR-API-KEY> --mnemonic
```

This will deploy the contract and update `.env` with the deployed address.

2. Send USD payment:

```bash
npx blueprint run sendUsdPayment <YOUR-TON-WALLET-ADDRESS> 1 --custom https://testnet.toncenter.com/api/v2/jsonRPC --custom-version v2 --custom-type testnet --custom-key <YOUR-API-KEY> --mnemonic
```

## Project structure

-   `contracts` - Smart contract source code and dependencies
-   `wrappers` - Contract wrapper classes implementing serialization and compilation
-   `tests` - Contract test suite
-   `scripts` - Deployment and interaction scripts

## Development

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run scripts

`npx blueprint run` or `yarn blueprint run`

### Create new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`
