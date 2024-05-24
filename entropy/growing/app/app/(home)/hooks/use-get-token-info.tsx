import { NFTGrowtthAddress } from "@/contracts/addresses"
import { useReadNftGrowthNftInfo } from "@/contracts/generated"
import { useMemo } from "react"

export const useGetTokenInfo = (tokenId?: string) => {
  const { data: info, refetch } = useReadNftGrowthNftInfo({
    address: NFTGrowtthAddress,
    args: [BigInt(tokenId!)],
    query: {
      enabled: tokenId !== "",
    },
  })

  const level = useMemo(() => {
    return info?.[0].toString()
  }, [info])

  const status = useMemo(() => {
    if (info?.[1] !== undefined) {
      return info?.[1] === 0 ? "Alive" : "Dead"
    }
  }, [info])

  return {
    refetch,
    info: { level, status },
  }
}
