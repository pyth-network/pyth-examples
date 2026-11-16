"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Minus, Plus, Ticket, Users, Loader2, CheckCircle2, ExternalLink, X } from "lucide-react"
import { useAccount } from "wagmi"
import { useLottery } from "@/hooks/useLottery"
import { formatUSDC, parseUSDC } from "@/lib/viem-client"
import { toast } from "sonner"
import Link from "next/link"

export function TicketPurchase() {
  const [ticketCount, setTicketCount] = useState(1)
  const [referralCode, setReferralCode] = useState("")
  const [mounted, setMounted] = useState(false)
  const { isConnected } = useAccount()
  const { 
    ticketPrice, 
    formattedBalance, 
    buyTickets, 
    isBuying, 
    isLoading, 
    purchaseSuccess, 
    purchaseTxHash, 
    explorerUrl, 
    resetPurchaseSuccess 
  } = useLottery()

  // Prevent hydration mismatch by only rendering wallet-dependent content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const incrementTickets = () => setTicketCount((prev) => Math.min(prev + 1, 100))
  const decrementTickets = () => setTicketCount((prev) => Math.max(prev - 1, 1))

  const ticketPriceNum = ticketPrice ? Number(ticketPrice) / 1_000_000 : 1
  const totalCost = ticketCount * ticketPriceNum
  const jackpotContribution = totalCost * 0.7
  const referralAmount = totalCost * 0.3

  const handleBuyTickets = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    // Allow purchase even if ticketPrice is not loaded yet (will use default 1 USDC)
    if (isLoading) {
      toast.info("Loading ticket price, please wait...")
      return
    }

    try {
      console.log("Calling buyTickets...", { ticketCount, referralCode, ticketPrice })
      await buyTickets(ticketCount, referralCode || undefined)
      console.log("buyTickets called successfully")
      // Note: buyTickets will handle approval and purchase
      // Success will be handled by the hook watching for events
      // Show info toast that transaction is being prompted
      toast.info("Please confirm the transaction in your wallet", {
        duration: 5000,
      })
    } catch (error: any) {
      console.error("Error buying tickets:", error)
      toast.error("Failed to buy tickets", {
        description: error?.message || "Please try again",
      })
    }
  }

  // Reset success banner when user starts a new purchase
  useEffect(() => {
    if (isBuying && purchaseSuccess) {
      resetPurchaseSuccess()
    }
  }, [isBuying, purchaseSuccess, resetPurchaseSuccess])

  return (
    <Card className="p-6 md:p-8">
      <div className="space-y-6">
        {/* Success Banner */}
        {purchaseSuccess && purchaseTxHash && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                  You've just bought a ticket!{" "}
                  <a
                    href={`${explorerUrl}/tx/${purchaseTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline hover:no-underline"
                  >
                    View on BaseScan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
                <Link href="/dashboard">
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Go to My Tickets
                  </Button>
                </Link>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={resetPurchaseSuccess}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Ticket className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Purchase Tickets</h2>
            <p className="text-sm text-muted-foreground">1 USDC per ticket</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ticket-count" className="text-base font-semibold mb-3 block">
              Number of Tickets
            </Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementTickets}
                disabled={ticketCount <= 1}
                className="h-12 w-12 bg-transparent"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <Input
                  id="ticket-count"
                  type="number"
                  min="1"
                  max="100"
                  value={ticketCount}
                  onChange={(e) => setTicketCount(Math.max(1, Math.min(100, Number.parseInt(e.target.value) || 1)))}
                  className="text-center text-2xl font-bold h-12 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={incrementTickets}
                disabled={ticketCount >= 100}
                className="h-12 w-12"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Maximum 100 tickets per transaction</p>
          </div>

          <div>
            <Label htmlFor="referral-code" className="text-base font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Referral Code (Optional)
            </Label>
            <Input
              id="referral-code"
              placeholder="Enter referral code"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Support your friend! They will receive 30% of your ticket cost.
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-6 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tickets</span>
              <span className="font-medium">{ticketCount}x</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price per ticket</span>
              <span className="font-medium">
                {isLoading ? "..." : `${ticketPriceNum.toFixed(2)} USDC`}
              </span>
            </div>
            {mounted && isConnected && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your USDC Balance</span>
                <span className="font-medium">{formattedBalance} USDC</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">To Jackpot (70%)</span>
              <span className="font-medium text-primary">{jackpotContribution.toFixed(2)} USDC</span>
            </div>
            {referralCode && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Referral Bonus (30%)</span>
                <span className="font-medium text-accent">{referralAmount.toFixed(2)} USDC</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <span className="text-lg font-semibold">Total Cost</span>
            <span className="text-3xl font-bold text-primary">{totalCost} USDC</span>
          </div>
        </div>

        <Button
          onClick={handleBuyTickets}
          disabled={isBuying || (mounted && !isConnected)}
          className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBuying ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing transaction...
            </>
          ) : mounted && isConnected ? (
            `Buy ${ticketCount} ${ticketCount === 1 ? "Ticket" : "Tickets"}`
          ) : (
            "Connect Wallet to Buy"
          )}
        </Button>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-semibold">What happens next?</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Your tickets are recorded on the blockchain</li>
            <li>• Daily drawing at midnight UTC</li>
            <li>• Winner receives first payment immediately</li>
            <li>• Monthly payments for 10 years via Aave</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}
