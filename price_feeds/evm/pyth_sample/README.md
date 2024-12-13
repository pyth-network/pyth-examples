# Pyth Oracle sample app

This directory contains an example of a smart contract using Pyth Price Feeds.

Please see the [Pyth documentation](https://docs.pyth.network/documentation/pythnet-price-feeds) for more information about Pyth and how to integrate it into your application.

### Building

You need to have [Foundry](https://getfoundry.sh/) and `node` installed to run this example.
Once you have installed these tools, run the following commands from root directory to install forge dependencies:

```
forge install foundry-rs/forge-std@v1.8.0 --no-git --no-commit
```

After installing the above dependencies, you need to install pyth-sdk-solidity.

```
npm init -y
npm install @pythnetwork/pyth-sdk-solidity
```

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