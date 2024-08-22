# Coin Flip Example application

This directory contains an example application that demonstrates how to use Pyth Entropy to flip a fair coin.
The example consists of a Solidity contract that implements a coin flip and a Typescript script that interacts with the contract.

Please note that this example is for demonstration purposes only and should not be used in production.

Please see the Pyth Entropy [documentation](https://docs.pyth.network/entropy) for more information.

## Try it out

First, you have to choose a network to run the example on.
The example has been deployed on the following networks:

```
| Chain Name       | Address                                    | 
|------------------|--------------------------------------------|
| optimism-sepolia | 0x2eE67fF5d8548fF544f2c178a0FcAFe503A634Be |
| arbitrum-sepolia | 0xCd76c50c3210C5AaA9c39D53A4f95BFd8b1a3a19 |
```

You will also need the private key of a wallet with some gas tokens for your chosen network.
Then, from the `coin_flip/app` directory, run the following command:

```
npm i

npm run flip-coin -- \
  --private-key <hexadecimal evm private key> \
  --address <address> \
  --chain-name <chain name>
```

You can populate the arguments to this command from the table above.
The command should print output like this:

```text
Running coin flip prototcol.
1. Generating user's random number...
   number    : 0x7c94c33d424e0a683deb15b55cc7d40d5cc8154478c76c971b677c35e32cb2f4
2. Requesting coin flip...
   fee       : 101 wei
   tx        : 0x23e8e1c800d2e9c55d7e8bf1b2bd5e835979c1aa076f56ab4a74828a45684d9b
   sequence  : 37
3. Waiting for result...
   result    : Tails
```

## Understanding the Example

The example consists of a Solidity contract and a Typescript script.
See the extensive code comments in the contract at `contract/src/CoinFlip.sol` to learn how the example works.
The typescript script is available at `app/src/flip_coin.ts` and demonstrates how to interact with the contract.
