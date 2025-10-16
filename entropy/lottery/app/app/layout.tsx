import AppProvider from "@/providers/app-provider"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Pyth Entropy Lottery",
  description: "A lottery application using Pyth Entropy for verifiable randomness",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <AppProvider>
        <body className={inter.className}>
          <div className="container mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center space-y-6 p-4">
            {children}
          </div>
        </body>
      </AppProvider>
    </html>
  )
}
