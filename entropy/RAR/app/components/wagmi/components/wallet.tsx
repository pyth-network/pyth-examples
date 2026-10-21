"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAccount, useDisconnect } from "wagmi"
import { shortenAddress } from "../utils/format-hex"
import { ConnectWalletDialog } from "./connect-wallet-dialog"
import { useUser } from '@/contexts/UserContext'

export const Wallet = () => {
  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect()
  const { user, isLoading } = useUser()

  if (isConnected && address) {
    const displayName = user?.username || shortenAddress(address)
    
    return (
      <div className="flex flex-col justify-center gap-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-max">
              {isLoading ? 'Loading...' : displayName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            onCloseAutoFocus={(e: Event) => e.preventDefault()}
            className="mr-6 rounded-lg p-0"
          >
            <div className="p-3 border-b border-gray-700">
              <p className="text-sm font-medium text-white">{user?.username}</p>
              <p className="text-xs text-gray-400">{shortenAddress(address)}</p>
            </div>
            <DropdownMenuItem
              className="p-4 hover:cursor-pointer"
              onClick={() => disconnect()}
            >
              Disconnect Wallet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  } else {
    return <ConnectWalletDialog />
  }
}