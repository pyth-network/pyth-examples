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

  const flipTxHash = await coinFlipContract.write.requestFlip([randomNumber], {
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
            resolve(log.args.isHeads ? "Heads" : "Tails");
            unwatch();
          }
        }
      },
    });
  });

  console.log(`\nFlip Result: ${result}`);
}

main();