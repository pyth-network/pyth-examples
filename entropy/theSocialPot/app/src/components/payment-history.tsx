"use client"

import { Card } from "@/components/ui/card"
import { Calendar, ExternalLink } from "lucide-react"

const payments = [
  {
    date: "Jan 15, 2025",
    amount: "$820.00",
    type: "Monthly Payment",
    txHash: "0x4d2a...8f91",
    status: "completed",
  },
  {
    date: "Dec 15, 2024",
    amount: "$820.00",
    type: "Monthly Payment",
    txHash: "0x7e9c...3b42",
    status: "completed",
  },
  {
    date: "Nov 15, 2024",
    amount: "$820.00",
    type: "Initial Win Payment",
    txHash: "0x1a8f...6d23",
    status: "completed",
  },
]

export function PaymentHistory() {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Payment History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Transaction</th>
                <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length > 0 ? (
                payments.map((payment, index) => (
                  <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="py-4 px-4 text-sm">{payment.date}</td>
                    <td className="py-4 px-4 text-sm">{payment.type}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-primary">{payment.amount}</td>
                    <td className="py-4 px-4">
                      <a
                        href={`https://basescan.org/tx/${payment.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                      >
                        {payment.txHash}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground">
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    No payment history yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  )
}
