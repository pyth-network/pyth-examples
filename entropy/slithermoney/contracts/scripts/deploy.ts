import { network } from "hardhat";
import { config } from "../config.js";

const { viem, networkName } = await network.connect();
const client = await viem.getPublicClient();

const chainId = Number(await client.getChainId());
const chainConfig = config[chainId as keyof typeof config];

if (!chainConfig) {
  throw new Error(`No config found for chain ID ${chainId}`);
}

// USDC has 6 decimals, so 0.01 USDC = 0.01 * 10^6 = 10000
const wagerAmountWei = BigInt(Math.floor(parseFloat(chainConfig.wagerAmount) * 1e6));

// Set isFlare based on chain ID: true if NOT 84532 (base-sepolia), false if 84532
const isFlare = chainId !== 84532;
console.log(`Chain ID: ${chainId}, isFlare: ${isFlare}`);

const snake = await viem.deployContract("Snake", [
  chainConfig.entropyV2Address as `0x${string}`,
  wagerAmountWei,
  chainConfig.usdcAddress as `0x${string}`,
  isFlare,
]);

console.log("Snake address:", snake.address);

console.log("Waiting 20 seconds before verification...");
await new Promise(resolve => setTimeout(resolve, 20000));

// const tx = await snake.write.requestRandomNumber();

// console.log("Waiting for the snake.requestRandomNumber() tx to confirm");
// await client.waitForTransactionReceipt({ hash: tx, confirmations: 1 });
import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

await verifyContract(
  {
    address: snake.address,
    provider: "blockscout", // or "blockscout", or "sourcify"
    constructorArgs: [
      chainConfig.entropyV2Address as `0x${string}`,
      wagerAmountWei,
      chainConfig.usdcAddress as `0x${string}`,
      isFlare,
    ],
  },
  hre,
);

