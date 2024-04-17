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

```bash
export RPC_URL=<RPC_URL>
export PRIVATE_KEY=<PRIVATE_KEY>
```


Before deploying the Oracle AMM contract, you need to have ERC-20 tokens to test with.


```bash
TOKEN_NAME="My test token"
TOKEN_SYMBOL="TEST"
INITIAL_MINT=<Your Wallet address>
```

You can run the following command to deploy the token contract:

```bash
forge create ERC20Mock --rpc-url $RPC_URL --private-key $PRIVATE_KEY --constructor-args "$TOKEN_NAME" "$TOKEN_SYMBOL" "$INITIAL_MINT" "0"
```
Copy the `DEPLOYED TO` address from the output and store it in the environment variable `ERC20_CONTRACT_ADDRESS`.

```bash
export ERC20_CONTRACT_ADDRESS=<ERC20_CONTRACT_ADDRESS>
```

```
cast send --rpc-url <RPC_URL> -l <ERC20_CONTRACT_ADDRESS> "mint(address,uint256)" <YOUR_WALLET_ADDRESS> <QUANTITY_IN_WEI>
```


Edit the configuration parameters in there before running to set the network and token name.
This will deploy a new mock token and print out a contract address.
Once you have this address, you can mint the token anytime using the following command:

Add the following parameters to the [deploy script](./contract/scripts/deploy.sh) based on the network you are deploying to:
```
PYTH_CONTRACT_ADDRESS=<PYTH_CONTRACT_ADDRESS>
BASE_FEED_ID=<BASE_FEED_ID>
QUOTE_FEED_ID=<QUOTE_FEED_ID>
BASE_ERC20_ADDRESS=<BASE_ERC20_ADDRESS>
QUOTE_ERC20_ADDRESS=<QUOTE_ERC20_ADDRESS>
```


After updating the parameters, run this script using `./scripts/deploy.sh`.







When the contract is deployed, the token pools are initially empty.
You will need to send some funds to the pool for testing purposes.
You can use the following command to transfer ERC-20 tokens from your wallet to the contract:

```
cast send --rpc-url <RPC_URL> -l <ERC20_CONTRACT_ADDRESS> "transfer(address,uint256)" <DESTINATION_ADDRESS> <QUANTITY_IN_WEI>
```

### Create ABI

If you change the contract, you will need to create a new ABI.
The frontend uses this ABI to create transactions.
You can overwrite the existing ABI by running the following command:

```
forge inspect OracleSwap abi > ../app/src/abi/OracleSwapAbi.json
```

## Frontend Application

By default, the frontend is configured to use the already deployed version of the oracle AMM
at address [`0x15F9ccA28688F5E6Cbc8B00A8f33e8cE73eD7B02`](https://mumbai.polygonscan.com/address/0x15F9ccA28688F5E6Cbc8B00A8f33e8cE73eD7B02) on Polygon Mumbai.
This means you can start playing with the application without going through the steps above (Remember to switch your wallet to Mumbai and to claim funds from a faucet to pay for the gas).

### Build

From the root of the pyth-crosschain repository, run:

```
npm ci
npx lerna run build
```

This command will install dependencies for all packages within the typescript monorepo, and also build some
typescript SDKs that this example depends on.

### Run

After building, you can start the frontend by navigating to the `app/` directory and running:

`npm run start`

Then navigate your browser to `localhost:3000`.

### Other configurations:

optimism goerli addresses
brl 0x8e2a09b54fF35Cc4fe3e7dba68bF4173cC559C69
usd 0x98cDc14fe999435F3d4C2E65eC8863e0d70493Df
swap contract 0xf3161b2B32761B46C084a7e1d8993C19703C09e7
