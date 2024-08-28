# Coin Flip Example application

This directory contains an example application that demonstrates how to use Pyth Entropy to flip a fair coin.
The example consists of a Solidity contract that implements a coin flip and a Typescript script that interacts with the contract.

Please note that this example is for demonstration purposes only and should not be used in production.

Please see the Pyth Entropy [documentation](https://docs.pyth.network/entropy) for more information.

## Try it out

First, you have to choose a network to run the example on.
The example has been deployed on the following networks:

```
| Chain Name       | Address                                    | RPC URL
|------------------|--------------------------------------------|---------------------------------------------------------------|
| optimism-sepolia | 0x2eE67fF5d8548fF544f2c178a0FcAFe503A634Be | https://endpoints.omniatech.io/v1/op/sepolia/public	
| arbitrum-sepolia | 0xCd76c50c3210C5AaA9c39D53A4f95BFd8b1a3a19 | https://endpoints.omniatech.io/v1/arbitrum/sepolia/public	
```

NOTE: We recommend using your own RPC URL for the best experience.

You will also need the private key of a wallet with some gas tokens for your chosen network.
Then, from the `coin_flip/app` directory, run the following command:

```
npm i

npm run flip-coin -- \
  --private-key <hexadecimal evm private key> \
  --address <address> \
  --chain-name <chain name> \
  --rpc-url <rpc url>
```

You can populate the arguments to this command from the table above.
The command should print output like this:

```text
1. Generating user's random number...
User Generated Random number: 0xcf29f434d1e80db1b6c650cd52ceab837131f02e68880beee71ee5c061fe8a5d

2. Requesting coin flip...
Flip Fee: 15000000000001 wei

3. Sending request to flip coin...

Transaction Hash: 0x3400f8e6146734afeae875e9aef1eee708e0843bb044e4b2c8dc7fc53d20020f

Polling Block: 16451104
Flip Request Number/ Sequence Number: 750

Receipt Block Number: 16451104

Polling Block: 16451106

Flip Result: Heads
```

## Understanding the Example

The example consists of a Solidity contract and a Typescript script.
See the extensive code comments in the contract at `contract/src/CoinFlip.sol` to learn how the example works.
The typescript script is available at `app/src/flip_coin.ts` and demonstrates how to interact with the contract.
