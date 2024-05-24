import { NFTGrowtthAddress } from "@/contracts/addresses"
import { useWriteNftGrowthMint } from "@/contracts/generated"
import { useCallback } from "react"
import { blastSepolia } from "viem/chains"
import { useWaitForTransactionReceipt } from "wagmi"

export const useMint = () => {
  const { data: hash, writeContract, isPending } = useWriteNftGrowthMint()

  const mint = useCallback(() => {
    writeContract({
      address: NFTGrowtthAddress,
      chainId: blastSepolia.id,
    })
  }, [writeContract])

  const { isLoading } = useWaitForTransactionReceipt({ hash })

  return {
    mint,
    isLoading: isPending || isLoading,
  }
}
