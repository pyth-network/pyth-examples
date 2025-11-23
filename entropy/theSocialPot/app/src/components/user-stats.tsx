"use client"

import { Card } from "@/components/ui/card"
import { Ticket, Trophy, Users, Coins } from "lucide-react"

const stats = [
  {
    icon: Ticket,
    label: "Active Tickets",
    value: "12",
    subtext: "For today's draw",
    color: "text-primary",
  },
  {
    icon: Trophy,
    label: "Total Won",
    value: "$0",
    subtext: "Lifetime winnings",
    color: "text-accent",
  },
  {
    icon: Users,
    label: "Referrals",
    value: "8",
    subtext: "Total referred",
    color: "text-secondary",
  },
  {
    icon: Coins,
    label: "Referral Earnings",
    value: "$24.60",
    subtext: "Total earned",
    color: "text-primary",
  },
]

export function UserStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.subtext}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
