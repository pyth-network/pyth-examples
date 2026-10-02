# Fetch and Update BTC Price Example

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-fuels`](https://github.com/FuelLabs/fuels-ts/tree/master/packages/create-fuels).

## Getting Started

1. Copy .env.example to .env.local

```bash
cp .env.example .env.local
```

2. Start the Fuel development server. This server will start a local Fuel node and provide hot-reloading for your smart contracts.

```bash
npm run fuels:dev
```

3. Start the Next.js development server.

```bash
npm run dev
```

## Features

- Connects to Fuel wallet
- Fetches BTC/USD price from Pyth Network
- Updates price on-chain using Pyth's price feed
- Displays current price

## Smart Contract

The main contract (`UpdatePrice`) interacts with the Pyth contract to:

- Get the valid time period for price updates
- Fetch price data
- Update price feeds

You can find the contract code [here](sway-programs/contract/src/main.sw).

## Deploying to Testnet

To learn how to deploy your Fuel dApp to the testnet, you can follow our [Deploying to Testnet](https://docs.fuel.network/docs/fuels-ts/creating-a-fuel-dapp/deploying-a-dapp-to-testnet/) guide.

## Learn More

- [Fuel TS SDK docs](https://docs.fuel.network/docs/fuels-ts/)
- [Fuel Docs Portal](https://docs.fuel.network/)
