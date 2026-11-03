"use client"

import { Button } from "@/components/ui/button"
import { TrendingUp, Loader2 } from "lucide-react"
import Link from "next/link"
import { useLottery } from "@/hooks/useLottery"
import { useEffect, useState } from "react"

export function Hero() {
  const { isLoading } = useLottery()
  const [timeUntilMidnight, setTimeUntilMidnight] = useState("")

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now()
      const utcMidnight = new Date()
      utcMidnight.setUTCHours(24, 0, 0, 0) // Next midnight UTC
      const nextMidnight = utcMidnight.getTime()
      const timeLeft = nextMidnight - now

      if (timeLeft <= 0) {
        setTimeUntilMidnight("Drawing soon...")
        return
      }

      const hours = Math.floor(timeLeft / (1000 * 60 * 60))
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

      setTimeUntilMidnight(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  const jackpotNum = 0
  const ticketCount = 0

  return (
    <section className="relative pt-40 pb-20 px-4 overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-accent/15 via-background to-primary/10" />

      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            Powered by Aave Lending Protocol
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance">
            Win Today, <span className="text-primary">Give</span> Tomorrow
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-balance leading-relaxed">
            {
              "The smart lottery that pays you monthly and funds social projects. Buy tickets for just 1 USDC, win daily drawings, receive guaranteed monthly payments for 120 months, and help finance projects addressing health, housing, and food crises."
            }
          </p>
          
          <div className="text-lg text-muted-foreground font-medium">
            WIN. GIVE. GROW.
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/tickets">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6">
                Buy Tickets Now
              </Button>
            </Link>
            <Link href="/#how-it-works">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent">
                Learn More
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-bold text-primary">
                $ 990687
              </div>
              <div className="text-sm text-muted-foreground">Current Jackpot</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl md:text-5xl font-bold text-primary">
                {timeUntilMidnight || "..."}
              </div>
              <div className="text-sm text-muted-foreground">Next Drawing</div>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              ) : (
                <div className="text-4xl md:text-5xl font-bold text-primary">
                  {ticketCount.toLocaleString()}
                </div>
              )}
              <div className="text-sm text-muted-foreground">Tickets Sold Today</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
