"use client"

import { Card } from "@/components/ui/card"
import { Calendar, Check, Clock, Lock } from "lucide-react"

const generatePayments = () => {
  const payments = []
  const startDate = new Date("2024-11-15")
  const monthlyAmount = 820.42

  for (let i = 0; i < 12; i++) {
    const paymentDate = new Date(startDate)
    paymentDate.setMonth(paymentDate.getMonth() + i)

    let status: "claimed" | "available" | "upcoming" | "locked"
    if (i < 3) status = "claimed"
    else if (i === 3) status = "available"
    else if (i < 6) status = "upcoming"
    else status = "locked"

    payments.push({
      month: i + 1,
      date: paymentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      amount: monthlyAmount,
      status,
    })
  }
  return payments
}

export function VestingSchedule() {
  const payments = generatePayments()

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Vesting Schedule</h2>
          </div>
          <span className="text-sm text-muted-foreground">Showing first 12 months</span>
        </div>

        <div className="space-y-2">
          {payments.map((payment) => (
            <div
              key={payment.month}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                payment.status === "claimed"
                  ? "bg-muted/50 border-border"
                  : payment.status === "available"
                    ? "bg-primary/5 border-primary/30"
                    : payment.status === "upcoming"
                      ? "bg-accent/5 border-accent/20"
                      : "bg-background border-border"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    payment.status === "claimed"
                      ? "bg-accent/20"
                      : payment.status === "available"
                        ? "bg-primary/20"
                        : payment.status === "upcoming"
                          ? "bg-accent/10"
                          : "bg-muted"
                  }`}
                >
                  {payment.status === "claimed" && <Check className="w-5 h-5 text-accent" />}
                  {payment.status === "available" && <Calendar className="w-5 h-5 text-primary" />}
                  {payment.status === "upcoming" && <Clock className="w-5 h-5 text-accent" />}
                  {payment.status === "locked" && <Lock className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div>
                  <p className="font-semibold">Month {payment.month}</p>
                  <p className="text-sm text-muted-foreground">{payment.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-lg font-bold ${
                    payment.status === "claimed" ? "text-muted-foreground" : "text-primary"
                  }`}
                >
                  ${payment.amount.toLocaleString()}
                </p>
                <p className="text-xs font-medium capitalize">
                  {payment.status === "claimed" && <span className="text-accent">Claimed</span>}
                  {payment.status === "available" && <span className="text-primary">Ready to Claim</span>}
                  {payment.status === "upcoming" && <span className="text-accent">Coming Soon</span>}
                  {payment.status === "locked" && <span className="text-muted-foreground">Locked</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">Remaining: 108 months</span>
          <span className="text-sm font-medium">Total: $88,685.36</span>
        </div>
      </div>
    </Card>
  )
}
