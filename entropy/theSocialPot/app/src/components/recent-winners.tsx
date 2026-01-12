"use client"

import { Card } from "@/components/ui/card"
import { Trophy } from "lucide-react"

const recentWinners = [
  { address: "0x742d...a8f2", amount: "98,450", date: "2 days ago" },
  { address: "0x9a3b...4c12", amount: "87,230", date: "3 days ago" },
  { address: "0x1f8e...d943", amount: "105,890", date: "4 days ago" },
  { address: "0x5c2a...b761", amount: "92,100", date: "5 days ago" },
]

export function RecentWinners() {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Recent Winners</h3>
        </div>

        <div className="space-y-3">
          {recentWinners.map((winner, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="font-mono text-sm font-medium">{winner.address}</p>
                <p className="text-xs text-muted-foreground">{winner.date}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary">${winner.amount}</p>
                <p className="text-xs text-muted-foreground">Prize</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground text-center">All winners are verified on-chain</p>
        </div>
      </div>
    </Card>
  )
}
