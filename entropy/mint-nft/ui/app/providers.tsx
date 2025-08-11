"use client"

import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { base } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'
import { useEffect, useState } from 'react'
import type { ReactNode } from "react"

// Create a fallback config for SSR
const createConfig = () => {
  if (typeof window === 'undefined') {
    // Return a minimal config for SSR
    return null
  }
  
  return getDefaultConfig({
    appName: 'Pyth Entropy NFT Demo',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    chains: [base],
    ssr: false,
  })
}

const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  })
}

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<ReturnType<typeof getDefaultConfig> | null>(null)
  const [queryClient] = useState(() => createQueryClient())

  useEffect(() => {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      setConfig(createConfig())
      setMounted(true)
    }
  }, [])

  // Show loading state during hydration
  if (!mounted || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          initialChain={base}
          showRecentTransactions={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
