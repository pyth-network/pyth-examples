'use client'

import { useState, useEffect } from 'react'
import AppProvider from "@/providers/app-provider"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { PlayerBar } from "@/components/layout/PlayerBar"

const inter = Inter({ subsets: ["latin"] })

const metadata: Metadata = {
  title: "RAR - Random Algotithm Radio",
  description: "Discover, curate, and create with music",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProvider>
          <div className="flex h-screen bg-black text-white">
            <Sidebar onUploadClick={() => setShowUpload(true)} />
            <div className="flex-1 flex flex-col">
              <TopBar />
              <main className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-900 to-black pb-32">
                {children}
              </main>
            </div>
            <PlayerBar />
          </div>
        </AppProvider>
      </body>
    </html>
  )
}