"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getBaseTokenData, getQuoteTokenData } from '@/contracts/tokens'

interface TokenData {
  address: `0x${string}`
  symbol: string
  decimals: number
  poolBalance: bigint
}

interface TokenContextType {
  baseToken: TokenData | null
  quoteToken: TokenData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const TokenContext = createContext<TokenContextType | undefined>(undefined)

export function TokenProvider({ children }: { children: ReactNode }) {
  const [baseToken, setBaseToken] = useState<TokenData | null>(null)
  const [quoteToken, setQuoteToken] = useState<TokenData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTokenData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [baseTokenData, quoteTokenData] = await Promise.all([
        getBaseTokenData(),
        getQuoteTokenData()
      ])
      
      setBaseToken(baseTokenData)
      setQuoteToken(quoteTokenData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token data')
      console.error('Error fetching token data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTokenData()
  }, [])

  const value = {
    baseToken,
    quoteToken,
    isLoading,
    error,
    refetch: fetchTokenData
  }

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  )
}

export function useTokens() {
  const context = useContext(TokenContext)
  if (context === undefined) {
    throw new Error('useTokens must be used within a TokenProvider')
  }
  return context
} 