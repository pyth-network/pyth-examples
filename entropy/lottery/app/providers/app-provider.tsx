"use client"

import { WagmiConfig } from "@/config"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"
import { WagmiProvider } from "wagmi"
const queryClient = new QueryClient()

interface AppProviderProps {
  children: ReactNode
}
const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <>
      <WagmiProvider config={WagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </>
  )
}

export default AppProvider
