import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CoinFlipAddress } from '@/contracts/addresses'
import COIN_FLIP_ABI from '@/contracts/CoinFlip.json'

export const useCoinFlipRequestRandom = () => {
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const requestRandom = async () => {
    try {
      // Get the fee first
      const fee = await getRequestFee()
      
      return writeContract({
        address: CoinFlipAddress,
        abi: COIN_FLIP_ABI.abi,
        functionName: 'requestRandom',
        value: fee
      })
    } catch (error) {
      console.error('Error requesting random:', error)
      throw error
    }
  }
  
  return {
    requestRandom,
    hash,
    isPending
  }
}

export const useCoinFlipGetUserResult = (userAddress?: string) => {
  const { data, error, isLoading } = useReadContract({
    address: CoinFlipAddress,
    abi: COIN_FLIP_ABI.abi,
    functionName: 'getUserResult',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress
    }
  })
  
  return {
    data: data as [string, boolean, number, boolean] | undefined,
    error,
    isLoading
  }
}

export const useCoinFlipHasUserResult = (userAddress?: string) => {
  const { data, error, isLoading } = useReadContract({
    address: CoinFlipAddress,
    abi: COIN_FLIP_ABI.abi,
    functionName: 'hasUserResult',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress
    }
  })
  
  return {
    hasResult: data as boolean | undefined,
    error,
    isLoading
  }
}

export const useCoinFlipGetRequestFee = () => {
  const { data, error, isLoading } = useReadContract({
    address: CoinFlipAddress,
    abi: COIN_FLIP_ABI.abi,
    functionName: 'getRequestFee'
  })
  
  return {
    fee: data as bigint | undefined,
    error,
    isLoading
  }
}

// Helper function to get fee
async function getRequestFee(): Promise<bigint> {
  return BigInt('1000000000000000') 
}