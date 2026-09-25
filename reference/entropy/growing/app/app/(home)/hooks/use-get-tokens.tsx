import { NFTGrowtthAddress } from "@/contracts/addresses"
import { useReadNftGrowthTokensOfOwner } from "@/contracts/generated"
import { useMemo } from "react"
import { blastSepolia } from "viem/chains"
import { useAccount } from "wagmi"

export const useGetTokens = () => {
  const { address } = useAccount()
  const { data } = useReadNftGrowthTokensOfOwner({
    address: NFTGrowtthAddress,
    chainId: blastSepolia.id,
    args: [address!],
    query: {
      enabled: !!address,
    },
  })

  const tokens = useMemo(() => {
    return (
      data?.map((tokenId) => ({
        value: tokenId.toString(),
        label: `#${tokenId.toString()}`,
      })) || []
    )
  }, [data])

  return { tokens }
}
