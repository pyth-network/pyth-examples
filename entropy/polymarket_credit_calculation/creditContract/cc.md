USE BASE SEPOLIA :

base-sepolia	0x41c9e39574f40ad34c79f1c99b66a45efb830d4c	1 block	500,000 gas

how to do it and more info :
Best Practices
Limit gas usage on the callback
Keeping the callback function simple is crucial because the entropy providers limit gas usage. This ensures gas usage is predictable and consistent, avoiding potential issues with the callback.

For example, if you want to use entropy to generate a random number for each player in a round of game, you need to make sure that the callback function works for the maximum number of players that can be in each round. Otherwise, the callbacks will work for some rounds with fewer players, but will fail for rounds with more players.

Multiple solutions are possible to address this problem. You can store the random number received from the callback and either ask users to submit more transactions after the callback to continue the flow or run a background crank service to submit the necessary transactions.

The gas limit for each chain is listed on the contract addresses page.

Handling callback failures
While the default entropy provider is highly reliable, in rare cases a callback might not be received. This typically happens when there's an issue with your contract's callback implementation rather than with the provider itself. The most common causes are:

The callback function is using more gas than the allowed limit
The callback function contains logic that throws an error
If you're not receiving a callback, you can manually invoke it to identify the specific issue. This allows you to:

See if the transaction fails and why
Check the gas usage against the chain's callback gas limit
Debug your callback implementation
For detailed instructions on how to manually invoke and debug callbacks, refer to the Debug Callback Failures guide.

Generating random values within a specific range
You can map the random number provided by Entropy into a smaller range using the solidity modulo operator. Here is a simple example of how to map a random number provided by Entropy into a range between minRange and maxRange (inclusive).

// Maps a random number into a range between minRange and maxRange (inclusive)
function mapRandomNumber(
  bytes32 randomNumber,
  int256 minRange,
  int256 maxRange
) internal returns (int256) {
  uint256 range = uint256(maxRange - minRange + 1);
  return minRange + int256(uint256(randomNumber) % range);
}
 
Notice that using the modulo operator can distort the distribution of random numbers if it's not a power of 2. This is negligible for small and medium ranges, but it can be noticeable for large ranges. For example, if you want to generate a random number between 1 and 52, the probability of having value 5 is approximately 10^-77 higher than the probability of having value 50 which is infinitesimal.

Generating multiple random values in a single transaction
If you need to generate multiple random values in a single transaction, you can hash the random input provided by Entropy with a unique identifier for each random number.

In the following example, mapRandomNumber is used to generate 6 random attributes for a character.

function generateAttributes(bytes32 randomNumber) internal {
  int256 strength = mapRandomNumber(
    keccak256(abi.encodePacked(randomNumber, "strength")),
    15,
    20
  );
  int256 stamina = mapRandomNumber(
    keccak256(abi.encodePacked(randomNumber, "stamina")),
    10,
    15
  );
  int256 agility = mapRandomNumber(
    keccak256(abi.encodePacked(randomNumber, "agility")),
    5,
    15
  );
  int256 stealth = mapRandomNumber(
    keccak256(abi.encodePacked(randomNumber, "stealth")),
    0,
    5
  );
  int256 positionX = mapRandomNumber(
    keccak256(abi.encodePacked(randomNumber, "positionX")),
    -100,
    100
  );
  int256 positionY = mapRandomNumber(
    keccak256(abi.encodePacked(randomNumber, "positionY")),
    -100,
    100
  );
}
 


code example of a coin flip :


ts file :
import crypto from "crypto";
import { arbitrumSepolia, optimismSepolia } from "viem/chains";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { ICoinFlipAbi } from "./coin_flip_abi";

import {
  createWalletClient,
  getContract,
  http,
  publicActions,
  Hex,
  isHex,
  isAddress,
  parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const parser = yargs(hideBin(process.argv))
  .option("private-key", {
    description: "Private key (as a hexadecimal string) of the sender",
    type: "string",
    required: true,
  })
  .option("address", {
    description: "The address of the CoinFlip contract",
    type: "string",
    required: true,
  })
  .option("chain-name", {
    description:
      "The chain on which you want to test the CoinFlip contract (e.g., 'optimism-sepolia', 'arbitrum-sepolia')",
    type: "string",
    required: true,
  })
  .option("rpc-url", {
    description: "The RPC URL to use for the CoinFlip contract",
    type: "string",
    required: true,
  })
  .help()
  .alias("help", "h")
  .parserConfiguration({
    "parse-numbers": false,
  });

async function main() {
  const argv = await parser.argv;
  const chainName = argv.chainName;

  if (chainName !== "optimism-sepolia" && chainName !== "arbitrum-sepolia") {
    throw new Error("Invalid chain name");
  }
  if (!isHex(argv.privateKey, { strict: true })) {
    throw new Error("Private key must be a hexadecimal string");
  }
  if (!isAddress(argv.address, { strict: true })) {
    throw new Error("Invalid address");
  }
  if (!argv.rpcUrl.startsWith("http")) {
    throw new Error("RPC URL must start with http");
  }

  const client = createWalletClient({
    chain: chainName === "optimism-sepolia" ? optimismSepolia : arbitrumSepolia,
    account: privateKeyToAccount(argv.privateKey),
    transport: http(argv.rpcUrl),
  }).extend(publicActions);

  const coinFlipContract = getContract({
    address: argv.address,
    abi: ICoinFlipAbi,
    client,
  });

  console.log("1. Generating user's random number...");

  const randomNumber: `0x${string}` = `0x${crypto
    .randomBytes(32)
    .toString("hex")}`;
  console.log(`User Generated Random number: ${randomNumber}`);

  console.log("\n2. Requesting coin flip...");

  const flipFee = await coinFlipContract.read.getFlipFee();
  console.log(`Flip Fee: ${flipFee} wei`);

  console.log("\n3. Sending request to flip coin...");

const flipTxHash = await coinFlipContract.write.requestFlip({
    value: flipFee,
  });
  console.log(`Transaction Hash: ${flipTxHash}`);

  const receipt = await client.waitForTransactionReceipt({
    hash: flipTxHash,
  });

  const logs = parseEventLogs({
    abi: ICoinFlipAbi,
    eventName: "FlipRequest",
    logs: receipt.logs,
  });

  const sequenceNumber = logs[0].args.sequenceNumber;

  console.log(`\nSequence Number: ${sequenceNumber}`);

  console.log("\n4. Waiting for flip result...");
  const result = await new Promise((resolve, reject) => {
  const unwatch = coinFlipContract.watchEvent.FlipResult({
    fromBlock: receipt.blockNumber - 1n,
    onLogs: (logs) => {
        for (const log of logs) {
          if (log.args.sequenceNumber === sequenceNumber) {
            unwatch();
            resolve(log.args.isHeads ? "Heads" : "Tails");
          }
        }
      },
    });
  });

  console.log(`\nFlip Result: ${result}`);
}

main();


CONTRACT -:
// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.0;

// Import the entropy SDK in order to interact with the entropy contracts
import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
// Import the EntropyStructsV2 contract to get the ProviderInfo struct
import "@pythnetwork/entropy-sdk-solidity/EntropyStructsV2.sol";

library CoinFlipErrors {
    error IncorrectSender();

    error InsufficientFee();
}

/// Example contract using Pyth Entropy to allow a user to flip a secure fair coin.
/// Users interact with the contract by requesting a random number from the entropy provider.
/// The entropy provider will then fulfill the request by revealing their random number.
/// Once the provider has fulfilled their request the entropy contract will call back
/// the requesting contract with the generated random number.
///
/// The CoinFlip contract implements the IEntropyConsumer interface imported from the Solidity SDK.
/// The interface helps in integrating with Entropy correctly.
contract CoinFlip is IEntropyConsumer {
    // Event emitted when a coin flip is requested. The sequence number can be used to identify a request
    event FlipRequest(uint64 sequenceNumber);

    // Event emitted when the result of the coin flip is known.
    event FlipResult(uint64 sequenceNumber, bool isHeads);

    // Contracts using Pyth Entropy should import the solidity SDK and then store both the Entropy contract
    // and a specific entropy provider to use for requests. Each provider commits to a sequence of random numbers.
    // Providers are then responsible for fulfilling a request on chain by revealing their random number.
    // Users should choose a reliable provider who they trust to uphold these commitments.
    IEntropyV2 private entropy;
    address private entropyProvider;

    constructor(address _entropy, address _entropyProvider) {
        entropy = IEntropyV2(_entropy);
        entropyProvider = _entropyProvider;
    }

    // Request to flip a coin.
    function requestFlip() external payable {
        // The entropy protocol requires the caller to pay a fee (in native gas tokens) per requested random number.
        // This fee can either be paid by the contract itself or passed on to the end user.
        // This implementation of the requestFlip method passes on the fee to the end user.
        uint256 fee = entropy.getFeeV2();
        if (msg.value < fee) {
            revert CoinFlipErrors.InsufficientFee();
        }

        // Request the random number from the Entropy protocol. The call returns a sequence number that uniquely
        // identifies the generated random number. Callers can use this sequence number to match which request
        // is being revealed in the next stage of the protocol.
        // This requestV2 function will trust the provider to draw a random number. 
        uint64 sequenceNumber = entropy.requestV2{value: fee}();

        emit FlipRequest(sequenceNumber);
    }

    // Request to flip a coin with a custom gas limit.
    function requestFlipWithCustomGasLimit(uint32 gasLimit) external payable {
        uint256 fee = entropy.getFeeV2(gasLimit);
        if (msg.value < fee) {
            revert CoinFlipErrors.InsufficientFee();
        }

        uint64 sequenceNumber = entropy.requestV2{value: fee}(gasLimit);

        emit FlipRequest(sequenceNumber);
    }

    // Request to flip a coin with a custom provider and custom gas limit.
    function requestFlipWithCustomProviderAndGasLimit(address provider, uint32 gasLimit) external payable {
        uint256 fee = entropy.getFeeV2(provider, gasLimit);
        if (msg.value < fee) {
            revert CoinFlipErrors.InsufficientFee();
        }

        uint64 sequenceNumber = entropy.requestV2{value: fee}(provider, gasLimit);

        emit FlipRequest(sequenceNumber);
    }

    // Request to flip a coin with a custom provider and custom gas limit and userContribution / Random Number.
    function requestFlipWithCustomProviderAndGasLimitAndUserContribution(address provider, uint32 gasLimit, bytes32 userContribution) external payable {
        uint256 fee = entropy.getFeeV2(provider, gasLimit);
        if (msg.value < fee) {
            revert CoinFlipErrors.InsufficientFee();
        }

        uint64 sequenceNumber = entropy.requestV2{value: fee}(provider, userContribution, gasLimit);

        emit FlipRequest(sequenceNumber);
    }

    // Get the default gas limit for the default provider.
    function getDefaultProviderGasLimit() public view returns (uint32) {
        EntropyStructsV2.ProviderInfo memory providerInfo = entropy.getProviderInfoV2(entropy.getDefaultProvider());
        return providerInfo.defaultGasLimit;
    }

    // This method is required by the IEntropyConsumer interface.
    // It is called by the entropy contract when a random number is generated.
    function entropyCallback(
        uint64 sequenceNumber,
        // If your app uses multiple providers, you can use this argument
        // to distinguish which one is calling the app back. This app only
        // uses one provider so this argument is not used.
        address,
        bytes32 randomNumber
    ) internal override {
        emit FlipResult(sequenceNumber, uint256(randomNumber) % 2 == 0);
    }

    // This method is required by the IEntropyConsumer interface.
    // It returns the address of the entropy contract which will call the callback.
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    function getFlipFee() public view returns (uint256) {
        return entropy.getFeeV2();
    }

    receive() external payable {}
}