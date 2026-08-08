import { Card } from "@/components/ui/card"
import { Heart, Home, UtensilsCrossed, TrendingUp } from "lucide-react"

const impactAreas = [
  {
    icon: Heart,
    title: "Health Crisis",
    description: "Funding medical facilities, healthcare access, and emergency response programs for underserved communities.",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    icon: Home,
    title: "Housing Crisis",
    description: "Supporting affordable housing initiatives, shelter programs, and housing assistance for those in need.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: UtensilsCrossed,
    title: "Food Crisis",
    description: "Financing food banks, nutrition programs, and sustainable agriculture projects to combat hunger.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
]

export function SocialImpact() {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <TrendingUp className="w-4 h-4" />
            Social Impact
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Where Your Winnings Make a Difference</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto text-balance leading-relaxed">
            The interest generated from funds deposited on Aave (approximately <span className="font-semibold text-primary">$7 million annually</span>, 
            calculated with 1 million USDC daily at 4% interest) is dedicated to funding social projects addressing critical global crises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {impactAreas.map((area, index) => {
            const Icon = area.icon
            return (
              <Card key={index} className="p-8 hover:shadow-xl transition-all border-border bg-card">
                <div className="space-y-4">
                  <div className={`w-16 h-16 rounded-xl ${area.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-8 h-8 ${area.color}`} />
                  </div>
                  <h3 className="text-2xl font-semibold text-card-foreground">{area.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{area.description}</p>
                </div>
              </Card>
            )
          })}
        </div>

        <Card className="p-8 bg-primary/5 border-primary/20">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-foreground">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">1</div>
                <h4 className="font-semibold">Funds Deposited</h4>
                <p className="text-sm text-muted-foreground">
                  Winner funds are deposited on Aave lending protocol, generating interest at ~4% APY.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">2</div>
                <h4 className="font-semibold">Interest Generated</h4>
                <p className="text-sm text-muted-foreground">
                  With ~1M USDC daily deposits, approximately $7M in interest is generated annually.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">3</div>
                <h4 className="font-semibold">Social Projects Funded</h4>
                <p className="text-sm text-muted-foreground">
                  100% of interest goes to verified social projects addressing health, housing, and food crises.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}

