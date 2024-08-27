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

  if (argv.privateKey.length !== 64) {
    throw new Error("Private key must be 64 characters long");
  }

  const privateKey = argv.privateKey as Hex;

  if (argv.address.length !== 42) {
    throw new Error("Address must be 42 characters long");
  }
  const address = argv.address as Hex;

  if (!argv.rpcUrl.startsWith("http")) {
    throw new Error("RPC URL must start with http");
  }

  const client = createWalletClient({
    chain: chainName === "optimism-sepolia" ? optimismSepolia : arbitrumSepolia,
    account: privateKeyToAccount(privateKey),
    transport: http(argv.rpcUrl),
  }).extend(publicActions);

  const coinFlipContract = getContract({
    address,
    abi: ICoinFlipAbi,
    client,
  });

  console.log("1. Generating user's random number...");

  const randomNumber: `0x${string}` = `0x${crypto.randomBytes(32).toString("hex")}`;
  console.log(`User Generated Random number: ${randomNumber}`);

  console.log("\n2. Requesting coin flip...");

  const flipFee = await coinFlipContract.read.getFlipFee();
  console.log(`Flip Fee: ${flipFee} wei`);

  console.log("\n3. Sending request to flip coin...");

  let sequenceNumber: bigint;
  coinFlipContract.watchEvent.FlipRequest({
    onLogs: (logs) => {
      for (const log of logs) {
        console.log(
          `Flip Request Number/ Sequence Number: ${log.args.sequenceNumber}`
        );
        if (typeof log.args.sequenceNumber === "bigint") {
          sequenceNumber = log.args.sequenceNumber;
        } else {
          throw new Error(
            `Sequence number is not a bigint: ${log.args.sequenceNumber}`
          );
        }
      }
    },
  });

  await client.watchBlocks({
    onBlock: (block) => {
      console.log(`\nPolling Block: ${block.number}`);
      coinFlipContract.watchEvent.FlipResult({
        onLogs: (logs) => {
          for (const log of logs) {
            if (log.args.sequenceNumber === sequenceNumber) {
              console.log(
                `\nFlip Result: ${log.args.isHeads ? "Heads" : "Tails"}`
              );
              process.exit(0);
            }
          }
        },
      });
    },
  });

  

  const flipTxHash = await coinFlipContract.write.requestFlip(
    [randomNumber],
    { value: flipFee }
  );
  console.log(`\nTransaction Hash: ${flipTxHash}`);

  const receipt = await client.waitForTransactionReceipt({
    hash: flipTxHash,
  });

  const receiptBlockNumber = receipt.blockNumber;
  console.log(`\nReceipt Block Number: ${receiptBlockNumber}`);
}

main();
