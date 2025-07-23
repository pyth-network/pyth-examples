import { Address, ByteArray, createPublicClient, erc20Abi, getContract, http, WalletClient} from "viem";
import { LENDING_POOL_ADDRESS } from "./fund";
import { wagmiConfig } from "@/lib/wagmi";
import lendingPoolAbi from "./abis/LendingPool.json";

// Create public client for reading contract data
export const publicClient = createPublicClient({
chain: wagmiConfig.chains[0],
transport: http(),
});

const lendingPoolContract = getContract({
  address: LENDING_POOL_ADDRESS,
  abi: lendingPoolAbi,
  client: publicClient,
});

export async function getBaseTokenPriceId(): Promise<ByteArray> {
    const baseTokenPriceId = await lendingPoolContract.read.baseTokenPriceId();
    return baseTokenPriceId as ByteArray;
  }
  
  export async function getQuoteTokenPriceId(): Promise<ByteArray> {
    const quoteTokenPriceId = await lendingPoolContract.read.quoteTokenPriceId();
    return quoteTokenPriceId as ByteArray;
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

export async function approveToken(tokenAddress: Address, amount: bigint, walletClient: WalletClient): Promise<string> {
  const tokenContract = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: walletClient,
  });
  if (!walletClient.account) {
    throw new Error("Wallet client account is undefined");
  }
  const txHash = await tokenContract.write.approve([LENDING_POOL_ADDRESS, amount], {
    account: walletClient.account,
    chain: walletClient.chain,
  });
  console.log("Approval txHash", txHash);
  return txHash;
}

export async function getTokenAllowance(tokenAddress: Address, walletClient: WalletClient): Promise<bigint> {
  const tokenContract = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: walletClient,
  });
  const allowance = await tokenContract.read.allowance([walletClient.account?.address as Address, LENDING_POOL_ADDRESS]);
  return allowance;
}