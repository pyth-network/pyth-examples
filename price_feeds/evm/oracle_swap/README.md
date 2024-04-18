# Pyth Oracle AMM

This directory contains an example Oracle AMM application using Pyth price feeds.
The Oracle AMM manages a pool of two tokens and allows a user to trade with the pool at the current Pyth price.

This application has two components. The first component is a smart contract (in the `contract` directory) that manages the pool and implements the trading functionality.
The second is a frontend application (in the `app` directory) that communicates with the smart contract.

Check out [Pyth documentation](https://docs.pyth.network/price-feeds/use-real-time-data) for more information about Pyth and how to integrate it into your application.

**Warning** this AMM is intended only as a demonstration of Pyth price feeds and is **not for production use**.

## AMM Contract

All of the commands in this section expect to be run from the `contract` directory.

### Building

You need to have [Foundry](https://getfoundry.sh/) and `Node` installed to run this example.
Once you have installed these tools, run the following commands from the [`contract`](./contract) directory to install openzeppelin and forge dependencies:

```
forge install foundry-rs/forge-std@v1.8.0 --no-git --no-commit
forge install OpenZeppelin/openzeppelin-contracts@v4.8.1 --no-git --no-commit
```

After installing the above dependencies, install pyth-sdk-solidity.

```
npm init -y
npm install @pythnetwork/pyth-sdk-solidity
```

### Testing

Simply run `forge test` in the [`contract`](./contract) directory. This command will run the
tests located in the [`contract/test`](./contract/test) directory.

### Deploying

To deploy the contract, you first need to configure the target network and the tokens in the AMM pool.
You will also need the private key of a wallet with some gas tokens for your chosen network. 

Make sure your wallet has some ERC20 tokens to add to the pool.
Check the [Price feed IDs](https://pyth.network/developers/price-feed-ids) for tokens you want to use in the pool.

Check the [Pyth Contract Addresses](https://docs.pyth.network/price-feeds/contract-addresses/evm) for the network you want to deploy on.

```bash
export RPC_URL=<RPC_URL>
export PRIVATE_KEY=<PRIVATE_KEY>
export PYTH_CONTRACT_ADDRESS=<PYTH_CONTRACT_ADDRESS>
export BASE_FEED_ID=<BASE_FEED_ID>
export QUOTE_FEED_ID=<QUOTE_FEED_ID>
export BASE_ERC20_ADDRESS=<BASE_ERC20_ADDRESS>
export QUOTE_ERC20_ADDRESS=<QUOTE_ERC20_ADDRESS>
```

To deploy the contract, run the following command by passing constructor arguments:

``` bash
forge create src/OracleSwap.sol:OracleSwap \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL \
  --constructor-args \
  $PYTH_CONTRACT_ADDRESS \
  $BASE_FEED_ID \
  $QUOTE_FEED_ID \
  $BASE_ERC20_ADDRESS \
  $QUOTE_ERC20_ADDRESS
```


### Create ABI

If you change the contract, you will need to create a new ABI.
The frontend uses this ABI to create transactions.
You can overwrite the existing ABI by running the following command:

```
forge inspect OracleSwap abi > ../app/src/abi/OracleSwapAbi.json
```

## Frontend Application

By default, the frontend is configured to use the already deployed version of the Oracle AMM
at address [`0x15F9ccA28688F5E6Cbc8B00A8f33e8cE73eD7B02`](https://mumbai.polygonscan.com/address/0x15F9ccA28688F5E6Cbc8B00A8f33e8cE73eD7B02) on Polygon Mumbai.
This means you can start playing with the application without going through the steps above (Remember to switch your wallet to Mumbai and claim funds from a faucet to pay for the gas).

### Build

Switch to [app](./app/) directory and run:

```
npm i
npm run build
npm run start
```

This command will install dependencies and build the project for the demo.

### Run

After building, you can start the frontend by navigating to the `app/` directory and running:

`npm run start`

Then navigate your browser to `localhost:3000`.

### Other configurations:

optimism goerli addresses
brl 0x8e2a09b54fF35Cc4fe3e7dba68bF4173cC559C69
usd 0x98cDc14fe999435F3d4C2E65eC8863e0d70493Df
swap contract 0xf3161b2B32761B46C084a7e1d8993C19703C09e7
