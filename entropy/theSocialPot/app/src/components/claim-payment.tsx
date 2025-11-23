"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, AlertCircle, ExternalLink, Loader2 } from "lucide-react"
import { useVesting } from "@/hooks/useVesting"
import { useAccount } from "wagmi"
import { format } from "date-fns"
import { toast } from "sonner"
import { CONTRACT_ADDRESSES, NETWORK_CONFIG, BASE_SEPOLIA_CHAIN_ID } from "@/config/contracts"

export function ClaimPayment() {
  const { isConnected } = useAccount()
  const {
    vestingInfo,
    canClaim,
    formattedMonthlyAmount,
    formattedAaveBalance,
    isClaiming,
    isLoading,
    isWinner,
    claimPayment,
  } = useVesting()

  const handleClaim = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet")
      return
    }

    if (!isWinner) {
      toast.error("You are not the winner")
      return
    }

    try {
      toast.loading("Processing claim...")
      const receipt = await claimPayment()
      toast.success("Payment claimed successfully!")
    } catch (error: any) {
      console.error("Error claiming payment:", error)
      toast.error("Failed to claim payment", {
        description: error?.message || "Please try again",
      })
    }
  }

  if (!isConnected) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Connect your wallet to view claim information</p>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    )
  }

  if (!isWinner || !vestingInfo) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">You are not the current winner</p>
        </div>
      </Card>
    )
  }

  const nextClaimDate = vestingInfo.nextPaymentTime
    ? format(new Date(Number(vestingInfo.nextPaymentTime) * 1000), "MMM d, yyyy")
    : "N/A"

  const explorerUrl = NETWORK_CONFIG[BASE_SEPOLIA_CHAIN_ID].explorerUrl

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Claim Payment</h2>
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-6 border border-primary/20">
          <p className="text-sm text-muted-foreground mb-2">Available to Claim</p>
          <p className="text-4xl font-bold text-primary mb-1">
            ${parseFloat(formattedMonthlyAmount).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Month {Number(vestingInfo.paymentsMade) + 1} Payment
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Remaining</span>
            <span className="font-medium">${parseFloat(formattedAaveBalance).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payments Made</span>
            <span className="font-medium">
              {Number(vestingInfo.paymentsMade)} / 120
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Next Claim Date</span>
            <span className="font-medium">{nextClaimDate}</span>
          </div>
        </div>

        {canClaim ? (
          <Button
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleClaim}
            disabled={isClaiming}
          >
            {isClaiming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Claim Payment"
            )}
          </Button>
        ) : (
          <Button className="w-full h-12" disabled>
            Next Claim on {nextClaimDate}
          </Button>
        )}

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Payments can be claimed once every 30 days. Your funds are safely earning interest on Aave while vesting.
          </p>
        </div>
      </div>
    </Card>
  )
}
