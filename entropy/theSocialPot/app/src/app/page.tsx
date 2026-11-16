import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { LotteryDisplay } from "@/components/lottery-display"
import { Features } from "@/components/features"
import { HowItWorks } from "@/components/how-it-works"
import { SocialImpact } from "@/components/social-impact"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <LotteryDisplay />
          </div>
        </section>
        <Features />
        <HowItWorks />
        <SocialImpact />
      </main>
      <Footer />
    </div>
  )
}
