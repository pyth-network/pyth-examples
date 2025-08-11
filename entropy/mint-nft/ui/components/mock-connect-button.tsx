"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

export function ConnectButton() {
  const [isConnected, setIsConnected] = useState(false)
  const [address] = useState("0x1234...abcd")

  const handleConnect = () => {
    setIsConnected(!isConnected)
  }

  if (isConnected) {
    return (
      <Button variant="outline" onClick={handleConnect} className="flex items-center gap-2 bg-transparent">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="font-mono text-sm">{address}</span>
      </Button>
    )
  }

  return (
    <Button onClick={handleConnect} className="flex items-center gap-2">
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </Button>
  )
}
