import { Card } from "@/components/ui/card"
import { Ticket, Sparkles, Coins, Calendar } from "lucide-react"

const steps = [
  {
    icon: Ticket,
    step: "01",
    title: "Buy Tickets",
    description: "Purchase lottery tickets for just 1 USDC each. Use a referral code to support your friends.",
  },
  {
    icon: Sparkles,
    step: "02",
    title: "Daily Drawing",
    description: "Every day at midnight UTC, a winner is selected using Pyth Entropy's provably fair randomness.",
  },
  {
    icon: Coins,
    step: "03",
    title: "Instant First Payment",
    description: "Winners receive their first monthly payment immediately (1/120th of the jackpot).",
  },
  {
    icon: Calendar,
    step: "04",
    title: "10 Years of Payouts & Social Impact",
    description: "Remaining funds deposited on Aave. Claim your monthly payment for the next 119 months. The interest generated (~$7M annually) funds social projects addressing health, housing, and food crises.",
  },
]

export function HowItWorks() {
  return (
    <section className="pt-40 pb-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">How It Works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Four simple steps to win, earn, and make a positive social impact
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={index} className="relative">
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-border bg-card">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <span className="text-5xl font-bold text-muted/20">{step.step}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-card-foreground">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
