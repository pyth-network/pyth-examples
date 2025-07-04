import { resolve } from "path";

import { config } from "dotenv";
import type { Address, ByteArray } from "viem";
import { createPublicClient, erc20Abi, getContract, http } from "viem";

import { wagmiConfig } from "@/wagmi";

import ipythAbi from "./abis/IPyth.json";
import lendingPoolAbi from "./abis/LendingPool.json";

// Load environment variables from contracts folder
config({ path: resolve(process.cwd(), "../.env") });

// Get LENDING_POOL_ADDRESS from environment
const LENDING_POOL_ADDRESS = process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS as Address;
console.log("NEXT_PUBLIC_LENDING_POOL_ADDRESS", LENDING_POOL_ADDRESS);

if (!LENDING_POOL_ADDRESS) {
  throw new Error("LENDING_POOL_ADDRESS environment variable is required");
}

// Create public client for reading contract data
const publicClient = createPublicClient({
  chain: wagmiConfig.chains[0],
  transport: http(),
});

const lendingPoolContract = getContract({
  address: LENDING_POOL_ADDRESS,
  abi: lendingPoolAbi,
  client: publicClient,
});

const ipythContract = getContract({
  address: process.env.NEXT_PUBLIC_PYTH_ADDRESS as Address,
  abi: ipythAbi,
  client: publicClient,
});


export type Price = {
  price: bigint;
  conf: bigint;
  expo: number;
  publishTime: bigint;
}

export async function getBaseTokenPriceId(): Promise<ByteArray> {
  const baseTokenPriceId = await lendingPoolContract.read.baseTokenPriceId();
  return baseTokenPriceId as ByteArray;
}

export async function getQuoteTokenPriceId(): Promise<ByteArray> {
  const quoteTokenPriceId = await lendingPoolContract.read.quoteTokenPriceId();
  return quoteTokenPriceId as ByteArray;
}

export async function getPrice(priceId: ByteArray): Promise<Price> {
  const price = await ipythContract.read.getPriceUnsafe([priceId]);
  return price as Price;
}

// Function to get baseToken address from contract
export async function getBaseTokenData(): Promise<{address: `0x${string}`, symbol: string, decimals: number, poolBalance: bigint}> {
  try {
    const baseTokenAddress = await lendingPoolContract.read.baseToken();
    const baseTokenContract = getContract({
        address: baseTokenAddress as Address,
        abi: erc20Abi,
        client: publicClient,
      });
    const baseTokenSymbol = await baseTokenContract.read.symbol();
    const baseTokenDecimals = await baseTokenContract.read.decimals();
    const baseTokenPoolBalance = await baseTokenContract.read.balanceOf([LENDING_POOL_ADDRESS]);
    console.log("baseTokenPoolBalance", baseTokenPoolBalance);
    return {address: baseTokenAddress as Address, symbol: baseTokenSymbol, decimals: baseTokenDecimals, poolBalance: baseTokenPoolBalance};
  } catch (error) {
    console.error("Failed to get baseToken address:", error);
    throw new Error("Could not read baseToken address from contract");
  }
}

// Function to get quoteToken address from contract
export async function getQuoteTokenData(): Promise<{address: `0x${string}`, symbol: string, decimals: number, poolBalance: bigint}> {
  try {
    const quoteTokenAddress = await lendingPoolContract.read.quoteToken();
    const quoteTokenContract = getContract({
        address: quoteTokenAddress as Address,
        abi: erc20Abi,
        client: publicClient,
      });
    const quoteTokenSymbol = await quoteTokenContract.read.symbol();
    const quoteTokenDecimals = await quoteTokenContract.read.decimals();
    const quoteTokenPoolBalance = await quoteTokenContract.read.balanceOf([LENDING_POOL_ADDRESS]);
    console.log("quoteTokenPoolBalance", quoteTokenPoolBalance);
    return {address: quoteTokenAddress as Address, symbol: quoteTokenSymbol, decimals: quoteTokenDecimals, poolBalance: quoteTokenPoolBalance};
  } catch (error) {
    console.error("Failed to get quoteToken address:", error);
    throw new Error("Could not read quoteToken address from contract");
  }
}

export async function getNumberOfPositions(): Promise<number> {
  const numPositions = await lendingPoolContract.read.numPositions();
  return Number(numPositions);
}


// Function to get all contract addresses
export async function getContractData() {
  const [baseToken, quoteToken, numberOfPositions, baseTokenPriceId, quoteTokenPriceId] = await Promise.all([
    getBaseTokenData(),
    getQuoteTokenData(),
    getNumberOfPositions(),
    getBaseTokenPriceId(),
    getQuoteTokenPriceId(),
  ]);

  return {
    lendingPool: LENDING_POOL_ADDRESS,
    baseToken: baseToken.address,
    quoteToken: quoteToken.address,
    baseTokenSymbol: baseToken.symbol,
    quoteTokenSymbol: quoteToken.symbol,
    baseTokenDecimals: baseToken.decimals,
    quoteTokenDecimals: quoteToken.decimals,
    baseTokenPoolBalance: baseToken.poolBalance,
    quoteTokenPoolBalance: quoteToken.poolBalance,
    numberOfPositions: numberOfPositions,
    baseTokenPriceId: baseTokenPriceId,
    quoteTokenPriceId: quoteTokenPriceId,
  };
}


export async function borrow(amount: bigint) {
  const positionId = await lendingPoolContract.write.borrow([amount]);
  return Number(positionId);
}

// Export the contract instance for direct use
export { lendingPoolContract };


