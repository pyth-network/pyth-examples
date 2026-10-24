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
export const Wallet = () => {
  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    const shortenedAddress = shortenAddress(address)
    return (
      <div className="flex flex-col justify-center gap-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-max">{shortenedAddress}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            onCloseAutoFocus={(e: Event) => e.preventDefault()}
            className="mr-6 rounded-lg p-0"
          >
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
