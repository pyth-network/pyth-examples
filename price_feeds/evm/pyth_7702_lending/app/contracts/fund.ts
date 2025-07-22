import { Address, ByteArray, createPublicClient, http, getContract, WalletClient, parseEther } from "viem";
import lendingPoolAbi from "./abis/LendingPool.json";
import { wagmiConfig } from "@/lib/wagmi";

// Get LENDING_POOL_ADDRESS from environment
export const LENDING_POOL_ADDRESS = process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS as Address;
console.log("NEXT_PUBLIC_LENDING_POOL_ADDRESS", LENDING_POOL_ADDRESS);

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


export async function getBaseTokenPriceId(): Promise<ByteArray> {
  const baseTokenPriceId = await lendingPoolContract.read.baseTokenPriceId();
  return baseTokenPriceId as ByteArray;
}

export async function getQuoteTokenPriceId(): Promise<ByteArray> {
  const quoteTokenPriceId = await lendingPoolContract.read.quoteTokenPriceId();
  return quoteTokenPriceId as ByteArray;
}

export async function addTenderlyBalance(walletClient: WalletClient): Promise<{ success: boolean; message?: string }> {
  try {
    // Get RPC URL from wallet client if available, otherwise fallback
    let rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://virtual.base.rpc.tenderly.co/d20a0d8a-03ee-4c00-adc1-f51d5e98d8cc";
    
    if (walletClient?.transport?.url) {
      rpcUrl = walletClient.transport.url;
    }
    
    const requestBody = {
      id: 0,
      jsonrpc: "2.0",
      method: "tenderly_addBalance",
      params: [walletClient.account?.address as Address, "0xDE0B6B3A7640000"]
    };

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`RPC error: ${result.error.message}`);
    }

    console.log("Tenderly balance added successfully:", result);
    return { success: true, message: "Balance added successfully!" };
  } catch (error) {
    console.error("Failed to add Tenderly balance:", error);
    return { success: false, message: error instanceof Error ? error.message : "Failed to add balance" };
  }
}

export async function addTenderlyErc20Balance(
  walletClient: WalletClient, 
  tokenAddress: Address, 
  amount: string = "1000" // 1000 tokens
): Promise<{ success: boolean; message?: string }> {
  try {
    // Get RPC URL from wallet client if available, otherwise fallback
    let rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://virtual.base.rpc.tenderly.co/d20a0d8a-03ee-4c00-adc1-f51d5e98d8cc";
    
    if (walletClient?.transport?.url) {
      rpcUrl = walletClient.transport.url;
    }
    
    // Convert amount to hex string (1000 tokens with 18 decimals)
    const amountInWei = parseEther(amount)
    const amountHex = amountInWei.toString(16)
    
    const requestBody = {
      id: 0,
      jsonrpc: "2.0",
      method: "tenderly_addErc20Balance",
      params: [
        tokenAddress,
        [walletClient.account?.address as Address],
        `0x${amountHex}`
      ]
    };

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`RPC error: ${result.error.message}`);
    }

    console.log("Tenderly ERC20 balance added successfully:", result);
    return { success: true, message: "ERC20 balance added successfully!" };
  } catch (error) {
    console.error("Failed to add Tenderly ERC20 balance:", error);
    return { success: false, message: error instanceof Error ? error.message : "Failed to add ERC20 balance" };
  }
}
