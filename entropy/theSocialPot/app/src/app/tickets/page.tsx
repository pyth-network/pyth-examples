"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { TicketPurchase } from "@/components/ticket-purchase"
import { JackpotInfo } from "@/components/jackpot-info"
import { RecentWinners } from "@/components/recent-winners"

export default function TicketsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-40 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Buy Lottery Tickets</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Each ticket costs 1 USDC. The more tickets you buy, the higher your chances to win!
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <TicketPurchase />
            </div>
            <div className="space-y-6">
              <JackpotInfo />
              <RecentWinners />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
