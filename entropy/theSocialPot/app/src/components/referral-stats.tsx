"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Copy, Check } from "lucide-react"

export function ReferralStats() {
  const [copied, setCopied] = useState(false)
  const referralCode = "MY8F3X"
  const referralLink = `https://megayield.app/tickets?ref=${referralCode}`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const referrals = [
    { address: "0x9a3b...4c12", tickets: 15, earned: "$4.50" },
    { address: "0x742d...a8f2", tickets: 23, earned: "$6.90" },
    { address: "0x1f8e...d943", tickets: 8, earned: "$2.40" },
    { address: "0x5c2a...b761", tickets: 12, earned: "$3.60" },
  ]

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Referral Program</h2>
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-4 border border-primary/20">
          <p className="text-sm font-medium mb-3">Your Referral Link</p>
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="font-mono text-sm bg-background" />
            <Button onClick={copyToClipboard} variant="secondary" size="icon" className="shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Earn 30% of every ticket purchase from your referrals</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Recent Referrals</p>
          {referrals.length > 0 ? (
            <div className="space-y-2">
              {referrals.map((referral, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-mono text-sm font-medium">{referral.address}</p>
                    <p className="text-xs text-muted-foreground">{referral.tickets} tickets</p>
                  </div>
                  <span className="font-semibold text-primary">{referral.earned}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">No referrals yet</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
