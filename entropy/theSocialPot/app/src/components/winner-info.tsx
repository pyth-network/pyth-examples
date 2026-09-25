"use client"

import { Card } from "@/components/ui/card"
import { Trophy, Calendar, TrendingUp, DollarSign } from "lucide-react"

export function WinnerInfo() {
  // Mock winner data
  const winData = {
    wonDate: "Nov 15, 2024",
    totalPrize: 98450,
    monthlyPayment: 820.42,
    totalMonths: 120,
    claimedMonths: 3,
    remainingMonths: 117,
    nextClaimDate: "Feb 15, 2025",
    aaveBalance: 96634.89,
    interestEarned: 184.89,
  }

  return (
    <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Congratulations, Winner!</h2>
            <p className="text-muted-foreground">
              You won ${winData.totalPrize.toLocaleString()} on {winData.wonDate}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Monthly Payment</span>
            </div>
            <p className="text-2xl font-bold text-primary">${winData.monthlyPayment.toLocaleString()}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Progress</span>
            </div>
            <p className="text-2xl font-bold">
              {winData.claimedMonths}/{winData.totalMonths}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Aave Balance</span>
            </div>
            <p className="text-2xl font-bold text-accent">${winData.aaveBalance.toLocaleString()}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Interest Earned</span>
            </div>
            <p className="text-2xl font-bold text-accent">+${winData.interestEarned.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border">
          <span className="text-sm font-medium">Next Payment Available</span>
          <span className="text-lg font-bold text-primary">{winData.nextClaimDate}</span>
        </div>
      </div>
    </Card>
  )
}
