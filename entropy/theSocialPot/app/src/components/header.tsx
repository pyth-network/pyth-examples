"use client"

import Link from "next/link"
import Image from "next/image"
import { WalletButton } from "@/components/wallet-button"

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-2 relative">
        <div className="flex items-center justify-between gap-4">
          {/* Left navigation */}
          <nav className="hidden lg:flex items-center gap-6 flex-1">
            <Link
              href="/#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              How It Works
            </Link>
            <Link
              href="/tickets"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              Buy Tickets
            </Link>
          </nav>

          {/* Centered logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-20 h-20 lg:w-28 lg:h-28 relative">
              <Image 
                src="/logo.png" 
                alt="The Social Pot" 
                width={160} 
                height={160} 
                className="w-full h-full object-contain"
                style={{ background: 'transparent' }}
              />
            </div>
           
          </Link>

          {/* Right navigation */}
          <nav className="hidden lg:flex items-center gap-6 flex-1 justify-end">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              Dashboard
            </Link>
            <WalletButton />
          </nav>

          {/* Mobile wallet button */}
          <div className="lg:hidden">
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  )
}
