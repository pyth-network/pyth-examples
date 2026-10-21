'use client'

import { SkipBack, SkipForward } from "lucide-react"
import { Wallet } from "@/components/wagmi/components/wallet"

interface TopBarProps {
  children?: React.ReactNode
}

export function TopBar({ children }: TopBarProps) {
  return (
    <header className="bg-gradient-to-r from-gray-900 to-black p-6 flex items-center justify-between">
      <div className="flex space-x-4">
        {children || (
        <div className="flex items-center space-x-4">
          <Wallet /> 
          
        </div>
      )}
      </div>
      
      
    </header>
  )
}