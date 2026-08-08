"use client"

import { useEffect, useState } from "react"
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi"
import { injected } from "wagmi/connectors"
import { baseSepolia } from "viem/chains"
import { Button } from "@/components/ui/button"
import { Wallet, LogOut } from "lucide-react"

export function WalletButton() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected, chainId } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleConnect = async () => {
    try {
      connect({
        connector: injected(),
        chainId: baseSepolia.id,
      })
    } catch (error) {
      console.error("Error connecting:", error)
    }
  }

  const handleSwitchChain = async () => {
    if (chainId !== baseSepolia.id) {
      try {
        switchChain({ chainId: baseSepolia.id })
      } catch (error) {
        console.error("Error switching chain:", error)
      }
    }
  }

  // Return a placeholder during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button disabled variant="outline">
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet
      </Button>
    )
  }

  if (!isConnected) {
    return (
      <Button onClick={handleConnect} disabled={isConnecting} variant="outline">
        <Wallet className="w-4 h-4 mr-2" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    )
  }

  if (chainId !== baseSepolia.id) {
    return (
      <Button onClick={handleSwitchChain} variant="outline">
        Switch to Base Sepolia
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </span>
      <Button onClick={() => disconnect()} variant="outline" size="sm">
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  )
}
