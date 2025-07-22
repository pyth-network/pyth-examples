import { Address, ByteArray, createPublicClient, getContract, http } from "viem"
import { wagmiConfig } from "@/lib/wagmi"
import ipythAbi from "@/contracts/abis/IPyth.json"

// Create public client for reading contract data
const publicClient = createPublicClient({
  chain: wagmiConfig.chains[0],
  transport: http(),
})

const ipythContract = getContract({
  address: process.env.NEXT_PUBLIC_PYTH_ADDRESS as Address,
  abi: ipythAbi,
  client: publicClient,
})

export type Price = {
  price: bigint
  conf: bigint
  expo: number
  publishTime: bigint
}

export async function getPrice(priceId: ByteArray): Promise<Price> {
  const price = await ipythContract.read.getPriceUnsafe([priceId])
  return price as Price
} 