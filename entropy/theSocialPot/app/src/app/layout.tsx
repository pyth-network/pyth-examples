import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { Web3Provider } from "@/lib/web3-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "The Social Pot - Win, Give, Grow",
  description:
    "The smart lottery that pays you monthly and funds social projects. Win daily, receive 10-year monthly payouts, and help finance projects addressing health, housing, and food crises. WIN. GIVE. GROW.",
  generator: "v0.app",
  icons: {
    icon: "/logo.png?v=2",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} font-sans antialiased`}>
        <Web3Provider>
          {children}
          <Toaster />
        </Web3Provider>
        <Analytics />
      </body>
    </html>
  )
}
