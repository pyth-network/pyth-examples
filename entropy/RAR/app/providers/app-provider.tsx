"use client"

import { WagmiConfig } from "@/config"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"
import { WagmiProvider } from "wagmi"
import { UserProvider } from '@/contexts/UserContext'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerContext'

const queryClient = new QueryClient()

interface AppProviderProps {
  children: ReactNode
}

const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <WagmiProvider config={WagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <AudioPlayerProvider>
            {children}
          </AudioPlayerProvider>
        </UserProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default AppProvider