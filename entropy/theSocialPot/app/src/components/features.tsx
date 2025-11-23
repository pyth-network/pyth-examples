import { Card } from "@/components/ui/card"
import { TrendingUp, Calendar, Heart, Shield, Users, Zap } from "lucide-react"

const features = [
  {
    icon: TrendingUp,
    title: "Growing Returns",
    description: "Your prize grows through Aave lending. Earn interest on top of your monthly payments for 10 years.",
  },
  {
    icon: Calendar,
    title: "Monthly Payouts",
    description: "Receive guaranteed monthly payments for 120 months. Set it and forget it, we handle the rest.",
  },
  {
    icon: Heart,
    title: "Social Impact",
    description: "Every ticket purchase funds social projects addressing health, housing, and food crises. Win for yourself, give back to the world.",
  },
  {
    icon: Shield,
    title: "Provably Fair",
    description: "Powered by Pyth Entropy for transparent, verifiable randomness. No manipulation possible.",
  },
  {
    icon: Users,
    title: "Referral Rewards",
    description: "Earn 30% commission on every ticket sold through your referral link. Build passive income.",
  },
  {
    icon: Zap,
    title: "Daily Drawings",
    description: "New winner selected every day at midnight UTC. Multiple chances to win every week.",
  },
]

export function Features() {
  return (
    <section id="how-it-works" className="pt-40 pb-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Why Choose The Social Pot?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            The most innovative lottery system that combines winning, earning, and social impact
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-border bg-card">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-card-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
