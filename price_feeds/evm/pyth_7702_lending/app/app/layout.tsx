"use client"
import { Inter } from "next/font/google"
import "./globals.css"
import '@rainbow-me/rainbowkit/styles.css'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi'
import { ClientProviders } from '@/components/ClientProviders'

const inter = Inter({ subsets: ["latin"] })

// export const metadata: Metadata = {
//   title: "Pyth 7702 Lending",
//   description: "A lending protocol powered by Pyth price feeds",
// }

const queryClient = new QueryClient()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <ClientProviders>
              {children}
            </ClientProviders>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  )
}
