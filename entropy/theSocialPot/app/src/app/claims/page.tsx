"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WinnerInfo } from "@/components/winner-info"
import { VestingSchedule } from "@/components/vesting-schedule"
import { ClaimPayment } from "@/components/claim-payment"

export default function ClaimsPage() {
  // Mock data - would come from blockchain
  const isWinner = true

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Claim Your Winnings</h1>
            <p className="text-xl text-muted-foreground">
              Manage your monthly payments and track your vesting schedule
            </p>
          </div>

          {isWinner ? (
            <div className="space-y-6">
              <WinnerInfo />
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <VestingSchedule />
                </div>
                <div>
                  <ClaimPayment />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🎫</span>
              </div>
              <h2 className="text-2xl font-bold mb-4">No Active Winnings</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                You don't have any active winnings to claim. Keep playing for a chance to win!
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
