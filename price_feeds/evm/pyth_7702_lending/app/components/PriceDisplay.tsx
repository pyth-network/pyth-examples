"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Clock } from "lucide-react"
import { getBaseTokenPriceId, getQuoteTokenPriceId } from '@/contracts/tokens'
import { getPrice } from '@/lib/price-utils'
import { useTokens } from '@/contexts/TokenContext'
import { updatePrices } from '@/contracts/pyth'
import { useWalletClient } from 'wagmi'

interface PriceData {
  price: bigint
  conf: bigint
  expo: number
  publishTime: bigint
}

export function PriceDisplay() {
  const { baseToken, quoteToken } = useTokens()
  const [basePrice, setBasePrice] = useState<PriceData | null>(null)
  const [quotePrice, setQuotePrice] = useState<PriceData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: walletClient } = useWalletClient()
    const fetchPrices = async () => {
    if (!baseToken || !quoteToken) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const [basePriceId, quotePriceId] = await Promise.all([
        getBaseTokenPriceId(),
        getQuoteTokenPriceId()
      ])
      
      const [basePriceData, quotePriceData] = await Promise.all([
        getPrice(basePriceId),
        getPrice(quotePriceId)
      ])
      
      setBasePrice(basePriceData)
      setQuotePrice(quotePriceData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices')
      console.error('Error fetching prices:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const updateOnChainPrices = async () => {
    if (!baseToken || !quoteToken || !walletClient) return
    
    try {
      setIsUpdating(true)
      setError(null)
      
      const [basePriceId, quotePriceId] = await Promise.all([
        getBaseTokenPriceId(),
        getQuoteTokenPriceId()
      ])
      
      const tx = await updatePrices([basePriceId.toString(), quotePriceId.toString()], walletClient)
      console.log("tx", tx)
      
      // Refresh prices after update
      await fetchPrices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update prices')
      console.error('Error updating prices:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    if (baseToken && quoteToken) {
      fetchPrices()
    }
  }, [baseToken, quoteToken])

  const formatPrice = (priceData: PriceData | null) => {
    if (!priceData) return 'N/A'
    const price = Number(priceData.price) / Math.pow(10, Math.abs(priceData.expo))
    return `$${price.toFixed(6)}`
  }

  const formatTime = (priceData: PriceData | null) => {
    if (!priceData) return 'N/A'
    const timestamp = Number(priceData.publishTime) * 1000 // Convert to milliseconds
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`
    return `${Math.floor(diffMinutes / 1440)} days ago`
  }

  if (!baseToken || !quoteToken) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5" />
          <span>Current Prices</span>
        </CardTitle>
        <CardDescription>Real-time price feeds from Pyth Network</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Live Price Data
          </h3>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={fetchPrices} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button 
              size="sm" 
              variant="default" 
              onClick={updateOnChainPrices} 
              disabled={isUpdating || !walletClient}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? "animate-spin" : ""}`} />
              Update Prices
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-sm text-red-600 dark:text-red-400">
              Error: {error}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Base Token Price */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{baseToken.symbol}</span>
                <Badge variant="outline">Base</Badge>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(basePrice)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime(basePrice)}
              </div>
            </div>

            {/* Quote Token Price */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{quoteToken.symbol}</span>
                <Badge variant="outline">Quote</Badge>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(quotePrice)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {formatTime(quotePrice)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 