# Send-USD example for Starknet

This contract demonstrates usage of Pyth Price Feeds on Starknet. See [this page](https://docs.pyth.network/price-feeds/use-real-time-data/starknet) for more information.

## Setting up your environment

1. Install Scarb (the Cairo and Starknet development toolchain) by following [the installation instructions](https://docs.swmansion.com/scarb/download).
2. Install Starknet Foundry by following [the installation instructions](https://foundry-rs.github.io/starknet-foundry/getting-started/installation.html).
3. Install Starkli (a cli tool for Starknet) by following [the installation instructions](https://github.com/xJonathanLEI/starkli).
4. Install Katana (a local Starknet node) by following [the installation instructions](https://book.starknet.io/ch02-04-katana.html).

The `.tool-versions` file in the `contract` directory specifies the tool versions used by the contract.

## Local deployment

1. Start `katana` and keep it running in a separate shell.
2. Deploy pyth contract to katana by running the following commands:

```bash
git clone https://github.com/pyth-network/pyth-crosschain.git
cd pyth-crosschain/target_chains/starknet/contracts
deploy/deploy.sh > ~/pyth.env
```

This generates `~/pyth.env` file that should contain the address of the deployed contract, for example:

```bash
$ cat ~/pyth.env
PYTH_WORMHOLE_ADDRESS=0x07fa5a689a768982ecb60ed05f39ca8f6efe623dd32ee6f3608662e3452a104c
PYTH_CONTRACT_ADDRESS=0x00f61bf0314a478bfc865c71d33cc53c77d0f994ea4a228ccf888d14435a8821
```

3. Apply these variables to your current shell:

```bash
export $(xargs < ~/pyth.env)
```

4. Run Send-USD deploy script:

```bash
cd pyth-examples/price_feeds/starknet/send_usd/contract
deploy/deploy.sh > ~/send_usd.env
```

To verify your deployment, do the following steps:

1. Apply `SEND_USD_CONTRACT_ADDRESS` variable to your current shell:

```bash
export $(xargs < ~/send_usd.env)
```

2. Set the following variables:

```bash
export ACCOUNT_PRIVATE_KEY=0x2bbf4f9fd0bbb2e60b0316c1fe0b76cf7a4d0198bd493ced9b8df2a3a24d68a
export ACCOUNT_ADDRESS=0xb3ff441a68610b30fd5e2abbf3a1548eb6ba6f3559f2862bf2dc757e5828ca
```
This account should be pre-deployed and pre-funded in katana, so you will be able to send transactions from it.

3. Run the client:

```bash
cd ../client
npm install
npm run start
```
