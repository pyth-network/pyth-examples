"use client"

import { useState, useEffect, ReactNode } from 'react'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { TokenProvider } from '@/contexts/TokenContext'
import { ThemeProvider } from '@/components/theme-provider'

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a minimal structure while mounting to prevent hydration issues
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <RainbowKitProvider>
      <TokenProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </TokenProvider>
    </RainbowKitProvider>
  )
} 