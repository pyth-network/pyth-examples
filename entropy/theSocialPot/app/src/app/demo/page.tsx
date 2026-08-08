"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LotteryDemo } from "@/components/lottery-demo"

export default function DemoPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              🎰 Lottery Demo
            </h1>
            <p className="text-xl text-muted-foreground">
              Visualizza come funziona la lotteria in tempo reale
            </p>
          </div>
          <LotteryDemo />
        </div>
      </main>
      <Footer />
    </div>
  )
}

