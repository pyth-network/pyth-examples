'use client'

import { useState, useEffect } from 'react'
import { useAccount, useContractRead, useContractWrite, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi'
import { parseEther } from 'viem'
import { CONTRACTS, ENTROPY_BEASTS_ABI, GAS_LIMITS } from '@/lib/contracts'

export interface Beast {
  tokenId: bigint
  strength: bigint
  intelligence: bigint
}

export interface MintResult {
  tokenId: bigint
  strength: number
  intelligence: number
  gasUsed: number
}

export function useEntropyBeasts() {
  const { address, isConnected } = useAccount()
  const [mintedBeasts, setMintedBeasts] = useState<MintResult[]>([])
  const [isListening, setIsListening] = useState(false)

  // Read total supply
  const { data: totalSupply, refetch: refetchTotalSupply } = useContractRead({
    address: CONTRACTS.ENTROPY_BEASTS,
    abi: ENTROPY_BEASTS_ABI,
    functionName: 'totalSupply',
    watch: true,
  })

  // Mint beast function
  const { 
    data: mintHash, 
    write: mintBeast, 
    isPending: isMinting,
    error: mintError 
  } = useContractWrite({
    address: CONTRACTS.ENTROPY_BEASTS,
    abi: ENTROPY_BEASTS_ABI,
    functionName: 'mintBeast',
  })

  // Wait for transaction
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    data: receipt 
  } = useWaitForTransactionReceipt({
    hash: mintHash,
  })

  // Watch for BeastMinted events
  useWatchContractEvent({
    address: CONTRACTS.ENTROPY_BEASTS,
    abi: ENTROPY_BEASTS_ABI,
    eventName: 'BeastMinted',
    onLogs: (logs) => {
      logs.forEach((log) => {
        const { tokenId, strength, intelligence, gasUsed } = log.args
        if (tokenId && strength && intelligence && gasUsed) {
          const newBeast: MintResult = {
            tokenId,
            strength: Number(strength),
            intelligence: Number(intelligence),
            gasUsed: Number(gasUsed),
          }
          setMintedBeasts(prev => [...prev, newBeast])
          setIsListening(false)
        }
      })
    },
  })

  // Get beast by token ID
  const getBeast = async (tokenId: bigint): Promise<Beast | null> => {
    try {
      const result = await fetch(`/api/beast/${tokenId}`)
      if (!result.ok) return null
      const beast = await result.json()
      return beast
    } catch (error) {
      console.error('Error fetching beast:', error)
      return null
    }
  }

  // Mint function
  const mint = async (isBig: boolean, gasLimit: number) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected')
    }

    // Calculate fee (approximate - in real implementation you'd call getFee)
    const fee = isBig ? parseEther('0.003') : parseEther('0.001')

    setIsListening(true)
    
    mintBeast({
      args: [gasLimit as any, isBig],
      value: fee,
    })
  }

  // Reset minted beasts
  const resetMintedBeasts = () => {
    setMintedBeasts([])
  }

  return {
    // State
    totalSupply: totalSupply ? Number(totalSupply) : 0,
    mintedBeasts,
    isListening,
    isMinting,
    isConfirming,
    isConfirmed,
    mintError,
    
    // Actions
    mint,
    getBeast,
    resetMintedBeasts,
    refetchTotalSupply,
  }
}
