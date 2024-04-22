## Chainlink Migration Example

This example demonstrates how to deploy a Chainlink-compatible application to Pyth Network price feeds.
The application `src/ChainlinkApp.sol` is designed to use Chainlink price feeds.
The script `script/PythAggregatorV3Deployment.sol` deploys this application with the [`PythAggregatorV3`](https://github.com/pyth-network/pyth-crosschain/blob/main/target_chains/ethereum/sdk/solidity/PythAggregatorV3.sol) adapter contract, such that it uses Pyth price feeds.

## Installation

This example uses [Foundry](https://book.getfoundry.sh/getting-started/installation), `npm` and `jq`.
Please install these tools if you don't have them already. 

Install the solidity dependencies by running:

```bash copy
npm install
forge install foundry-rs/forge-std@v1.8.0 --no-git --no-commit
```

## Deploy 

To run the deployment script, you will need a blockchain with a Pyth contract, a wallet with some tokens and an RPC node.
Export the value of your wallet's private key, the RPC URL, and the [Pyth contract address](https://docs.pyth.network/price-feeds/contract-addresses/evm) as environment variables: 

```bash copy
export PRIVATE_KEY=0x...
export RPC_URL=https://sepolia.optimism.io/
export PYTH_ADDRESS=0x0708325268dF9F66270F1401206434524814508b
```

Then, deploy the contracts by running:

```bash copy
forge script script/PythAggregatorV3Deployment.s.sol --rpc-url $RPC_URL --broadcast
```

This command will print something like:

```
##### optimism-sepolia
✅  [Success]Hash: 0xbca3b74534042646899091ee6298e42b491e565dc676691291b144d59974fe93
Contract Address: 0xbac361910F2a8cEB96c9207302acb692B4708a8b
Block: 10873047
Paid: 0.001974369167163242 ETH (658123 gas * 3.000000254 gwei)


##### optimism-sepolia
✅  [Success]Hash: 0x45f41d30c1e971d3e2bbc6de4586a5da3633e5051218808a475e75938e78e66b
Contract Address: 0x481F16240c55631c78fBF5B2B4191Aa98087C355
Block: 10873047
Paid: 0.001974369167163242 ETH (658123 gas * 3.000000254 gwei)


##### optimism-sepolia
✅  [Success]Hash: 0xfea9cea348ea62d66305ca46181b4a261afff6ea744a50ba8d6a5766b2fe254f
Contract Address: 0x1e8ad7B210EA49e2B910C0D74fa259f83f76D64b
Block: 10873047
Paid: 0.000676959057315862 ETH (225653 gas * 3.000000254 gwei)
```

The first two contracts are instances of `PythAggregatorV3` and the final address is the `ChainlinkApp` contract. 
Set the address of the deployed `ChainlinkApp` contract as an environment variable for later reference:

```
export CONTRACT_ADDR=0x7E1Bf7047200dB58A0eD8002552e1243B0DB4bfC
```

## Try it out

The repo provides two scripts for interacting with the deployed application.

First, `script/UpdatePrice.s.sol` updates the on-chain Pyth price.
Pyth is a pull oracle, so it has permissionless price updates.
Retrieve a price update and post it on-chain by running the following commands:

```bash
curl 'https://hermes.pyth.network/v2/updates/price/latest?ids[]=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace&ids[]=0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d' | jq '.binary.data[0]' -r > price_update.txt
export PRICE_UPDATE="0x`cat price_update.txt`"
forge script script/UpdatePrice.s.sol --rpc-url $RPC_URL --broadcast
```

Please see [Schedule Price Updates](https://docs.pyth.network/price-feeds/schedule-price-updates) for ways to schedule on-chain updates to Pyth price feeds.  

Second, `script/GetEthSolPrice.s.sol` interacts with a method on the `ChainlinkApp` contract: 

```bash
forge script script/GetEthSolPrice.s.sol --rpc-url $RPC_URL --broadcast
```

