import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog"
import { WalletOptions } from "./wallet-options"

export function ConnectWalletDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Connect Wallet</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>Connect a Wallet</DialogHeader>
        <WalletOptions />
      </DialogContent>
    </Dialog>
  )
}
