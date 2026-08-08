# Team "Los Hydra Boys" Pythathon Submission

## Details

Team Name: Los Hydra Boys
Submission Name: Hermes Market
Team Members: Ignacio Dopazo (@ignaciodopazo), Nicolás Ludueña (@nicolasLuduena), Valentino Cerutti (@Micrograx)
Contact: luduena.nicolas.victorio@gmail.com

## Project Description

Hermes market is a proof of concept integration of Pyth oracle information with Cardano's bleeding edge L2 [Hydra](https://hydra.family/head-protocol) that allows for real time bets on BTC price. Therefore truly giving an edge over a simple 5 minute market with up to 2 minute block finality in the L1 on the worst cases. Even on mainnet with high congestion scenarios, block confirmation is not guaranteed after several days.

## Motivation

Cardano is a powerful and very secure blockchain, but slow for the fast transactions: Cardano's consensus algorithm, while efficient, still requires massive global replication of state changes, potentially increasing transaction settlement times during peak hours. For our use case, we require real-time transaction settlement times.

For solving this issue, we rely on Hydra L2 to provide the speed and scalability we need for this project. Hydra L2 is a layer 2 solution that is built on top of Cardano and provides a low-latency, high-throughput, and secure way to process transactions.

For the Oracle service, we use Pyth, a service provider of real-time price feeds for various kinds of assets. For this PoC, we built a 5-minute prediction market for BTC/USD trading pair.

## Architecture

### Onchain

We designed an Aiken smart contract for managing the markets lifecycle and the bets placed on them through the orders script.

There are several operations that can be performed on the market script:
- Create a new market: every 5 minutes, a new market UTxOis created associated with a fresh order script.
- Place Buy or Sell order: a user can place a buy or sell order for receiving the appropriate position tokens.
- Record the final price of the market: the oracle service will record the final price in the market UTxO.
- Claim winnings: a winning user can claim the winnings by providing the position tokens.
- Claim losses: user provide their losing tokens for being burned.
- Close the market: the market is closed by burning the Market UTxO control token.
- Process an orders match: grab complementary orders from opposite directions, and distribute the tokens appropriately.

You can find the diagrams for all these transactions [here](./doc/transactions.pdf)

### Infrastructure

Two Hydra nodes required for running one Hydra Head in offline mode. We declare the initial UTxO set for the Hydra chain, inject the appropriate scripts and assets for working with the Pyth oracle service.

### Server & Offchain

The server encompasses the prediction market business logic for interacting with the onchain scripts, and with the offchain services that interact with the Pyth oracle service and builds the Market script transactions. Also, we have a Hydra service that connects seamlessly with the Hydra nodes for sending and receiving transactions, and looking up for useful blockchain information.

### Client

The client is a simple React application to visualize the current prediction market state, with real-time updates coming from the server being shown in a nice real-time udpated chart, with buy and sell orders being shown as well. It also allows to place buy and sell orders, and to claim winnings or losses.

### Limitations

A key limitation for this PoC is that we use Hydra in offline mode, which means that the Hydra nodes are not connected to a Cardano Node, but we just declar a initial UTxO set for the Hydra chain. For using Pyth within Hydra in this offline mode setup, we "inject" the Pyth-related onchain entities (withdraw validator and Pyth State asset) in the initial UTxO set. 

But for a production deployment in a public testnet or mainnet, the part of injecting the Pyth-related onchain entities on the Hydra initial UTxO set presents a real challenge. We would need to spend the UTxO containing the Pyth State asset for being commited to the Hydra chain. Naturally, the Pyth contract will not allow this to happen.

So for this idea to work in a public testnet or mainnet, either an update of the Pyth contract is needed, or an update of the Hydra protocol is needed for supporting L1 UTxOs as reference inputs (no spending allowed) inside the Hydra Head. This would be sufficient since the UTxO holding the Pyth State asset is only needed as reference inputs in the Oracle operations.

## Tech Stack

- App: Vite + React + TailwindCSS
- Server: Node.js + WebSocket
- Infrastructure: Docker compose, Hydra
- Onchain: Aiken, [Pyth Lazer Aiken lib](https://github.com/pyth-network/pyth-lazer-cardano)
- Offchain: Lucid Evolution

## Setup & Run

1. Run the infrastructure: see [infra/README.md](./infra/README.md)
2. Run the server
```bash
cd server
pnpm install
pnpm api
```
3. Run the UI
```bash
cd ui
pnpm install
pnpm dev
```