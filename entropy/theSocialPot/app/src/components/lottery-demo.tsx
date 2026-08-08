"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, Clock, Sparkles, Trophy, Ticket, Zap } from "lucide-react"
// Using CSS animations instead of framer-motion for simplicity

interface TicketPurchase {
  id: string
  buyer: string
  amount: number
  timestamp: number
}

interface Winner {
  address: string
  amount: number
  day: number
}

export function LotteryDemo() {
  const [jackpot, setJackpot] = useState(0)
  const [ticketCount, setTicketCount] = useState(0)
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 45, seconds: 30 })
  const [purchases, setPurchases] = useState<TicketPurchase[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [drawingStage, setDrawingStage] = useState<'idle' | 'requesting' | 'selecting' | 'revealing' | 'complete'>('idle')
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)
  const [allParticipants, setAllParticipants] = useState<string[]>([])

  // Simulate ticket purchases
  useEffect(() => {
    if (!isRunning || isDrawing) return

    const interval = setInterval(() => {
      // Random purchase every 2-5 seconds
      const delay = Math.random() * 3000 + 2000
      
      setTimeout(() => {
        const buyers = [
          "0x742d...a8f2",
          "0x9a3b...4c12",
          "0x1f8e...d943",
          "0x5c2a...b761",
          "0x8b1c...2b3e",
          "0x3f4a...9c5d",
        ]
        const amounts = [1, 2, 3, 5, 7, 10]
        
        const buyer = buyers[Math.floor(Math.random() * buyers.length)]
        const purchase: TicketPurchase = {
          id: Date.now().toString(),
          buyer: buyer,
          amount: amounts[Math.floor(Math.random() * amounts.length)],
          timestamp: Date.now(),
        }

        setPurchases((prev) => [purchase, ...prev].slice(0, 10))
        setTicketCount((prev) => prev + 1)
        setJackpot((prev) => prev + purchase.amount * 0.7) // 70% to jackpot
        
        // Track unique participants
        setAllParticipants((prev) => {
          if (!prev.includes(buyer)) {
            return [...prev, buyer]
          }
          return prev
        })
      }, delay)
    }, 100)

    return () => clearInterval(interval)
  }, [isRunning, isDrawing])

  // Countdown timer
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev
        seconds--

        if (seconds < 0) {
          seconds = 59
          minutes--
        }
        if (minutes < 0) {
          minutes = 59
          hours--
        }
        if (hours < 0) {
          hours = 23
        }

        return { hours, minutes, seconds }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning])

  // Simulate drawing when time runs out
  useEffect(() => {
    if (timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0 && ticketCount > 0 && !isDrawing) {
      simulateDrawing()
    }
  }, [timeLeft, ticketCount, isDrawing])

  const simulateDrawing = async () => {
    setIsDrawing(true)
    setIsRunning(false)
    setDrawingStage('requesting')

    // Stage 1: Requesting random number (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setDrawingStage('selecting')

    // Stage 2: Selecting winner (3 seconds) - show all participants spinning
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Select random winner from all participants
    const participants = allParticipants.length > 0 ? allParticipants : purchases.map(p => p.buyer)
    const uniqueParticipants = [...new Set(participants)]
    const winnerAddress = uniqueParticipants[Math.floor(Math.random() * uniqueParticipants.length)] || "0x742d...a8f2"
    
    setSelectedWinner(winnerAddress)
    setDrawingStage('revealing')

    // Stage 3: Revealing winner (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setDrawingStage('complete')

    // Stage 4: Show winner and reset (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const winner: Winner = {
      address: winnerAddress,
      amount: jackpot,
      day: winners.length + 1,
    }

    setWinners((prev) => [winner, ...prev])
    setJackpot(0)
    setTicketCount(0)
    setPurchases([])
    setAllParticipants([])
    setTimeLeft({ hours: 23, minutes: 59, seconds: 59 })
    setSelectedWinner(null)
    setDrawingStage('idle')
    setIsDrawing(false)
    setIsRunning(true)
  }

  const startDemo = () => {
    setIsRunning(true)
    setJackpot(0)
    setTicketCount(0)
    setPurchases([])
    setAllParticipants([])
    setTimeLeft({ hours: 0, minutes: 0, seconds: 10 }) // Start with 10 seconds for quick demo
  }

  const stopDemo = () => {
    setIsRunning(false)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Demo Controls</h2>
            <p className="text-sm text-muted-foreground">
              {isRunning ? "🎬 Demo in corso..." : "⏸️ Demo fermata"}
            </p>
          </div>
          <div className="flex gap-3">
            {!isRunning ? (
              <>
                <Button onClick={startDemo} className="bg-primary">
                  <Zap className="w-4 h-4 mr-2" />
                  Avvia Demo
                </Button>
                <Button 
                  onClick={() => {
                    setTimeLeft({ hours: 0, minutes: 0, seconds: 3 })
                    if (!isRunning) {
                      startDemo()
                      setTimeout(() => {
                        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
                      }, 100)
                    }
                  }} 
                  variant="outline"
                  disabled={ticketCount === 0}
                >
                  ⚡ Test Estrazione (3s)
                </Button>
              </>
            ) : (
              <Button onClick={stopDemo} variant="outline">
                Ferma Demo
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Jackpot Display */}
      <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-2 border-primary/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 animate-pulse" />
        
        <div className="relative z-10">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Daily Lottery Drawing
              </span>
            </div>

            <div className="space-y-2 animate-pulse">
              <div className="text-sm text-muted-foreground">Current Jackpot</div>
              <div 
                key={jackpot}
                className="text-5xl md:text-7xl font-bold text-primary tracking-tight transition-all duration-300"
              >
                ${jackpot.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Countdown */}
            <div className="pt-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Next Drawing In</span>
              </div>
              <div className="flex items-center justify-center gap-3 md:gap-6">
                <div
                  key={timeLeft.hours}
                  className="flex flex-col items-center bg-background/80 backdrop-blur-sm rounded-lg p-4 min-w-[80px] border border-border transition-transform duration-300 hover:scale-105"
                >
                  <div className="text-3xl md:text-4xl font-bold text-foreground">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Hours</div>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">:</div>
                <div
                  key={timeLeft.minutes}
                  className="flex flex-col items-center bg-background/80 backdrop-blur-sm rounded-lg p-4 min-w-[80px] border border-border transition-transform duration-300 hover:scale-105"
                >
                  <div className="text-3xl md:text-4xl font-bold text-foreground">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Minutes</div>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">:</div>
                <div
                  key={timeLeft.seconds}
                  className="flex flex-col items-center bg-background/80 backdrop-blur-sm rounded-lg p-4 min-w-[80px] border border-border transition-transform duration-300 hover:scale-105 animate-pulse"
                >
                  <div className="text-3xl md:text-4xl font-bold text-foreground">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Seconds</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Tickets Sold</div>
              <div
                key={ticketCount}
                className="text-2xl font-bold text-foreground transition-all duration-300"
              >
                {ticketCount}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Monthly Payment</div>
              <div className="text-2xl font-bold text-foreground">
                ${(jackpot / 120).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">For 120 months</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ticket Price</div>
              <div className="text-2xl font-bold text-foreground">$1.00</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Purchases */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Ticket className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Recent Purchases</h3>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0 animate-in slide-in-from-left-5 duration-300"
            >
              <div>
                <p className="font-mono text-sm font-medium">{purchase.buyer}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(purchase.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary">{purchase.amount} ticket{purchase.amount > 1 ? 's' : ''}</p>
                <p className="text-xs text-muted-foreground">+${(purchase.amount * 0.7).toFixed(2)} to jackpot</p>
              </div>
            </div>
          ))}
          {purchases.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nessun acquisto ancora...
            </div>
          )}
        </div>
      </Card>

      {/* Winners */}
      {winners.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Recent Winners</h3>
          </div>
          <div className="space-y-3">
            {winners.map((winner, index) => (
              <div
                key={index}
                className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-medium text-green-600 dark:text-green-400">
                      {winner.address}
                    </p>
                    <p className="text-xs text-muted-foreground">Day {winner.day}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 dark:text-green-400">
                      ${winner.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Prize</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Drawing Animation - Full Screen Experience */}
      {isDrawing && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-500">
          <div className="w-full max-w-4xl mx-4">
            {/* Stage 1: Requesting Random Number */}
            {drawingStage === 'requesting' && (
              <div className="bg-background border-2 border-primary rounded-lg p-12 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6 animate-spin" />
                <h2 className="text-4xl font-bold mb-4 text-primary">Requesting Random Number</h2>
                <p className="text-xl text-muted-foreground">Connecting to Pyth Entropy...</p>
                <div className="mt-6 flex justify-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}

            {/* Stage 2: Selecting Winner */}
            {drawingStage === 'selecting' && (
              <div className="bg-background border-2 border-accent rounded-lg p-12 text-center animate-in fade-in duration-500">
                <h2 className="text-4xl font-bold mb-6 text-accent">Selecting Winner</h2>
                <p className="text-xl text-muted-foreground mb-8">Randomizing from {allParticipants.length || ticketCount} participants...</p>
                
                {/* Show all participants with pulsing animation */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
                  {allParticipants.length > 0 ? allParticipants.map((participant, idx) => (
                    <div
                      key={idx}
                      className="bg-muted/50 rounded-lg p-3 font-mono text-sm animate-pulse"
                      style={{ animationDelay: `${idx * 0.1}s`, animationDuration: '1.5s' }}
                    >
                      {participant}
                    </div>
                  )) : purchases.map((p, idx) => (
                    <div
                      key={p.id}
                      className="bg-muted/50 rounded-lg p-3 font-mono text-sm animate-pulse"
                      style={{ animationDelay: `${idx * 0.1}s`, animationDuration: '1.5s' }}
                    >
                      {p.buyer}
                    </div>
                  ))}
                </div>
                
                <div className="mt-8">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent transition-all duration-[3000ms] ease-in-out"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stage 3: Revealing Winner */}
            {drawingStage === 'revealing' && selectedWinner && (
              <div className="bg-gradient-to-br from-green-500/20 to-primary/20 border-2 border-green-500 rounded-lg p-12 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-32 h-32 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center animate-in zoom-in-95 duration-500">
                  <Trophy className="w-16 h-16 text-white" />
                </div>
                <h2 className="text-5xl font-bold mb-4 text-green-600 dark:text-green-400 animate-in slide-in-from-bottom-4 duration-500">
                  🎉 Winner Found! 🎉
                </h2>
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '0.5s' }}>
                  <p className="text-2xl font-mono font-bold text-foreground mb-2">
                    {selectedWinner}
                  </p>
                  <p className="text-xl text-muted-foreground mb-6">
                    Has won the jackpot!
                  </p>
                  <div className="bg-background/80 rounded-lg p-6 mt-6">
                    <p className="text-sm text-muted-foreground mb-2">Total Prize</p>
                    <p className="text-4xl font-bold text-primary">
                      ${jackpot.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">First Payment (Immediate)</p>
                      <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                        ${(jackpot / 120).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">Monthly Payments (120 months)</p>
                      <p className="text-lg font-semibold">
                        ${(jackpot / 120).toLocaleString(undefined, { maximumFractionDigits: 2 })}/month
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 4: Complete */}
            {drawingStage === 'complete' && selectedWinner && (
              <div className="bg-background border-2 border-primary rounded-lg p-12 text-center animate-in fade-in duration-500">
                <div className="text-6xl mb-4">✨</div>
                <h2 className="text-3xl font-bold mb-4">Drawing Complete!</h2>
                <p className="text-muted-foreground">Preparing for next round...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

