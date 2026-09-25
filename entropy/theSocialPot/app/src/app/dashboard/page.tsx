"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { UserStats } from "@/components/user-stats"
import { MyTickets } from "@/components/my-tickets"
import { ReferralStats } from "@/components/referral-stats"
import { PaymentHistory } from "@/components/payment-history"

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-40 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-xl text-muted-foreground">Track your tickets, winnings, and referral earnings</p>
          </div>

          <div className="space-y-6">
            <UserStats />

            <div className="grid lg:grid-cols-2 gap-6">
              <MyTickets />
              <ReferralStats />
            </div>

            <PaymentHistory />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
