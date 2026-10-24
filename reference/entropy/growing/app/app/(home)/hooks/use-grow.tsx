import { NFTGrowtthAddress } from "@/contracts/addresses"
import {
  useReadNftGrowthGetGrowFee,
  useWriteNftGrowthGrow,
} from "@/contracts/generated"
import { useCallback, useState } from "react"
import { blastSepolia } from "viem/chains"
import { useWaitForTransactionReceipt } from "wagmi"
import * as web3 from "web3"
import { useGetTokenInfo } from "./use-get-token-info"
import { useGetTokens } from "./use-get-tokens"
import { useGrowResult } from "./use-grow-result"

export const useGrow = () => {
  const [tokenId, setTokenId] = useState("")
  const { tokens } = useGetTokens()
  const { resetResult, growResult } = useGrowResult(tokenId)
  const { info, refetch } = useGetTokenInfo(tokenId)

  const {
    data: hash,
    writeContract,
    isPending,
    reset: resetGrow,
    isSuccess,
  } = useWriteNftGrowthGrow()
  const { data: price } = useReadNftGrowthGetGrowFee({
    address: NFTGrowtthAddress,
  })

  const grow = useCallback(() => {
    const randomNumber = web3.utils.randomHex(32) as `0x${string}`
    writeContract({
      address: NFTGrowtthAddress,
      chainId: blastSepolia.id,
      value: price,
      args: [BigInt(tokenId), randomNumber],
    })
  }, [writeContract, tokenId, price])

  const { isLoading } = useWaitForTransactionReceipt({ hash })

  const reset = useCallback(() => {
    resetResult()
    resetGrow()
    refetch()
  }, [resetResult, resetGrow, refetch])

  return {
    grow,
    isLoading: isPending || isLoading || isSuccess,
    setTokenId,
    tokens,
    info,
    tokenId,
    growResult,
    isSuccess,
    reset,
  }
}
