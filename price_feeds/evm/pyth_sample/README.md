# Pyth Oracle sample app

This directory contains an example of a smart contract using Pyth Price Feeds.

Please see the [Pyth documentation](https://docs.pyth.network/documentation/pythnet-price-feeds) for more information about Pyth and how to integrate it into your application.


### Pre-requisities
1) Install node.js, refer https://nodejs.org/en/download/package-manager. Once installed, check the version.

```shell
node --version
```
2) Install foundry, refer here - https://book.getfoundry.sh/getting-started/installation. Check for `forge` and `cast`

### Building
You need to have [Foundry](https://getfoundry.sh/) and `node` installed to run this example.
Once you have installed these tools, run the following commands from root directory to install forge dependencies:

```
forge install foundry-rs/forge-std@v1.8.0 --no-git
```

After installing the above dependencies, you need to install pyth-sdk-solidity.

```
npm install @pythnetwork/pyth-sdk-solidity
```

## Deploy the smart contract on any blockchain

```shell
export RPC_URL=<RPC_URL>
export PYTH_ADDRESS_FOR_BLOCKCHAIN=<PYTH_ADDRESS>
export PRIVATE_KEY=<PRIVATE_KEY>
export ETH_USD_ID=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace

# Get the address from https://docs.pyth.network/price-feeds/core/contract-addresses/evm

forge create src/PythSample.sol:PythSample --private-key $PRIVATE_KEY --rpc-url $RPC_URL --broadcast --constructor-args $PYTH_ADDRESS_FOR_BLOCKCHAIN 

```

## Interact with smart contract functions

```shell
cast call $DEPLOYMENT_ADDRESS "getPrice(bytes32)" 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace --rpc-url $RPC_URL
```

### Get price update from Hermes API
```shell
curl -s "https://hermes.pyth.network/v2/updates/price/latest?&ids[]=$ETH_USD_ID" | jq -r ".binary.data[0]" > price_update.txt
```

### Update and get the price

```shell
noglob cast send --private-key $PRIVATE_KEY --rpc-url $RPC_URL --value 0.0005ether $DEPLOYMENT_ADDRESS "getLatestPrice(bytes32,bytes[])" $ETH_USD_ID [0x$(cat price_update.txt)] 

cast call $DEPLOYMENT_ADDRESS "getPrice(bytes32)" $ETH_USD_ID --rpc-url $RPC_URL

cast --to-dec  <<Result>>

### Testing

Simply run `forge test` from root directory.


### Resources

- [Pyth Price Feeds Documentation](https://docs.pyth.network/price-feeds)
- [Pyth Price Feed IDs](https://www.pyth.network/developers/price-feed-ids)
- [Pyth Price Feeds Contracts](https://docs.pyth.network/price-feeds/contract-addresses/evm)

### Retrieve Price Updates.

Price updates can be retrieved using Hermes. It provides various ways to retrieve price updates.

For example

```
curl -X 'GET' \
  'https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43&ids%5B%5D=0xc96458d393fe9deb7a7d63a0ac41e2898a67a7750dbd166673279e06c868df0a'
```

Checkout [How to Fetch Price Updates](https://docs.pyth.network/price-feeds/fetch-price-updates) for more details.
