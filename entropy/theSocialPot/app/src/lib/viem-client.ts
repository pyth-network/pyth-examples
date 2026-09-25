import { createPublicClient, createWalletClient, http } from "viem"
import { baseSepolia } from "viem/chains"
import { BASE_SEPOLIA_CHAIN_ID, NETWORK_CONFIG } from "@/config/contracts"

// Create public client for read operations
export function getPublicClient() {
  const config = NETWORK_CONFIG[BASE_SEPOLIA_CHAIN_ID]
  return createPublicClient({
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  })
}

// Create wallet client from window.ethereum
export function getWalletClient() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return null
  }

  const config = NETWORK_CONFIG[BASE_SEPOLIA_CHAIN_ID]
  return createWalletClient({
    chain: baseSepolia,
    transport: http(config.rpcUrl),
    account: undefined, // Will be set when connecting
  })
}

// Helper to format USDC amount (6 decimals)
export function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1_000_000).toFixed(2)
}

// Helper to parse USDC amount (6 decimals)
export function parseUSDC(amount: string): bigint {
  return BigInt(Math.floor(parseFloat(amount) * 1_000_000))
}

