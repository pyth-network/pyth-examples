"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Clock, Users, Sparkles, Loader2, Zap, Trophy } from "lucide-react"
import { useLottery } from "@/hooks/useLottery"
import { useEffect, useState } from "react"
import Link from "next/link"
import { SplitFlapBoard } from "./split-flap-board"

export function LotteryDisplay() {
  const { isLoading } = useLottery()
  const [timeUntilMidnight, setTimeUntilMidnight] = useState("")
  const [timeParts, setTimeParts] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [demoMode, setDemoMode] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingStage, setDrawingStage] = useState<'idle' | 'requesting' | 'revealing' | 'complete'>('idle')
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)
  const [ticketCodes, setTicketCodes] = useState<Array<{ id: string; code: string }>>([])
  const [winnerTicketId, setWinnerTicketId] = useState<string | null>(null)

  useEffect(() => {
    const updateTime = () => {
      if (demoMode) {
        // Demo mode: countdown from 3 seconds
        setTimeParts((prev) => {
          let { hours, minutes, seconds } = prev
          
          if (hours === 0 && minutes === 0 && seconds === 0) {
            // Timer reached zero, trigger drawing
            if (!isDrawing) {
              triggerDrawing()
            }
            return { hours: 0, minutes: 0, seconds: 0 }
          }
          
          seconds--
          if (seconds < 0) {
            seconds = 59
            minutes--
          }
          if (minutes < 0) {
            minutes = 59
            hours--
          }
          
          return { hours, minutes, seconds }
        })
        return
      }

      // Normal mode: calculate time until next midnight UTC
      const now = Date.now()
      const utcMidnight = new Date()
      utcMidnight.setUTCHours(24, 0, 0, 0) // Next midnight UTC
      const nextMidnight = utcMidnight.getTime()
      const timeLeft = nextMidnight - now

      if (timeLeft <= 0) {
        setTimeUntilMidnight("Drawing now...")
        setTimeParts({ hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const hours = Math.floor(timeLeft / (1000 * 60 * 60))
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

      setTimeParts({ hours, minutes, seconds })
      setTimeUntilMidnight(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [demoMode, isDrawing])

  const triggerDrawing = async () => {
    setIsDrawing(true)
    setDrawingStage('requesting')

    // Genera biglietti mock per la demo
    const generateMockTickets = () => {
      const mockTickets: Array<{ id: string; code: string }> = []
      const count = Math.floor(Math.random() * 8) + 5 // 5-12 biglietti
      
      for (let i = 0; i < count; i++) {
        const txHash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`
        const logIndex = Math.floor(Math.random() * 100)
        const ticketId = `${txHash}-${logIndex}`
        mockTickets.push({ id: ticketId, code: "" })
      }
      
      return mockTickets
    }

    const mockTickets = generateMockTickets()
    setTicketCodes(mockTickets)

    // Seleziona un biglietto vincente casuale dai biglietti generati
    const winnerTicket = mockTickets[Math.floor(Math.random() * mockTickets.length)]
    setWinnerTicketId(winnerTicket.id)

    // Stage 1: Requesting random number (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock winner selection (indirizzo del vincitore)
    const mockWinners = [
      "0x742d...a8f2",
      "0x9a3b...4c12",
      "0x1f8e...d943",
      "0x5c2a...b761",
      "0x8b1c...2b3e",
    ]
    const winnerAddress = mockWinners[Math.floor(Math.random() * mockWinners.length)]
    
    setSelectedWinner(winnerAddress)
    setDrawingStage('revealing')

    // Stage 2: Revealing winner (6 secondi - più tempo per vedere il vincitore)
    await new Promise(resolve => setTimeout(resolve, 6000))
    setDrawingStage('complete')

    // Stage 4: Complete (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Reset
    setDrawingStage('idle')
    setSelectedWinner(null)
    setTicketCodes([])
    setWinnerTicketId(null)
    setIsDrawing(false)
    setDemoMode(false)
    // Piccolo delay per permettere al componente di resettarsi
    await new Promise(resolve => setTimeout(resolve, 100))
    // Reset timer to real time (next midnight UTC)
    const now = Date.now()
    const utcMidnight = new Date()
    utcMidnight.setUTCHours(24, 0, 0, 0)
    const nextMidnight = utcMidnight.getTime()
    const timeLeft = nextMidnight - now
    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)
    setTimeParts({ hours, minutes, seconds })
  }

  const startDemo = () => {
    setDemoMode(true)
    setTimeParts({ hours: 0, minutes: 0, seconds: 3 })
  }

  const jackpotNum = 990687 // Mock jackpot per la demo
  // Calcola il pagamento mensile: jackpot diviso 120 mesi
  const monthlyPayment = jackpotNum / 120
  // Calcola i biglietti venduti: se il 70% va al jackpot e ogni biglietto costa $1,
  // allora: jackpot / 0.70 = totale raccolto = numero di biglietti venduti
  const ticketCount = Math.floor(jackpotNum / 0.70)

  return (
    <div className="space-y-6">
      {/* Main Jackpot Card */}
      <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-2 border-primary/20 relative overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 animate-pulse" />
        
        <div className="relative z-10">
          <div className="text-center space-y-6">
            {/* Header */}
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Daily Lottery Drawing
              </span>
            </div>

            {/* Jackpot Amount */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Current Jackpot</div>
              {isLoading ? (
                <div className="flex justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </div>
              ) : (
                <div className="text-5xl md:text-7xl font-bold text-primary tracking-tight">
                  $990687
                </div>
              )}
            </div>

            {/* Countdown Timer */}
            <div className="pt-4">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Next Drawing In</span>
              </div>
              <div className="flex items-center justify-center gap-3 md:gap-6">
                <div className="flex flex-col items-center bg-background/80 backdrop-blur-sm rounded-lg p-4 min-w-[80px] border border-border">
                  <div className="text-3xl md:text-4xl font-bold text-foreground">
                    {String(timeParts.hours).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Hours</div>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">:</div>
                <div className="flex flex-col items-center bg-background/80 backdrop-blur-sm rounded-lg p-4 min-w-[80px] border border-border">
                  <div className="text-3xl md:text-4xl font-bold text-foreground">
                    {String(timeParts.minutes).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Minutes</div>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">:</div>
                <div className="flex flex-col items-center bg-background/80 backdrop-blur-sm rounded-lg p-4 min-w-[80px] border border-border">
                  <div className="text-3xl md:text-4xl font-bold text-foreground">
                    {String(timeParts.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Seconds</div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/tickets">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 shadow-lg">
                  Buy Tickets Now
                </Button>
              </Link>
              {!demoMode && !isDrawing && (
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={startDemo}
                  className="text-lg px-8 py-6 border-2"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Demo 
                
                </Button>
              )}
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
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary mt-1" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  {ticketCount.toLocaleString()}
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Unique buyers today
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Monthly Payment</div>
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary mt-1" />
              ) : (
                <div className="text-2xl font-bold text-foreground">
                  ${monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            For 120 months (10 years)
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ticket Price</div>
              <div className="text-2xl font-bold text-foreground">$1.00</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Per ticket (USDC)
          </div>
        </Card>
      </div>

      {/* Drawing Animation Overlay */}
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

            {/* Stage 2: Revealing Winner */}
            {drawingStage === 'revealing' && selectedWinner && (
              <div className="bg-gradient-to-br from-green-500/20 to-primary/20 border-2 border-green-500 rounded-lg p-12 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-32 h-32 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center animate-in zoom-in-95 duration-500">
                  <Trophy className="w-16 h-16 text-white" />
                </div>
                <h2 className="text-5xl font-bold mb-4 text-green-600 dark:text-green-400 animate-in slide-in-from-bottom-4 duration-500">
                  🎉 Winner Found! 🎉
                </h2>
                
                {/* Mostra il tabellone con il biglietto vincente - statico, senza animazioni */}
                <div className="mt-8 mb-8">
                  <SplitFlapBoard 
                    tickets={ticketCodes} 
                    isAnimating={false}
                    winnerTicketId={winnerTicketId}
                    showWinnerStatic={true}
                    className="max-w-4xl mx-auto"
                  />
                </div>

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
                      ${jackpotNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground">First Payment (Immediate)</p>
                      <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                        ${(jackpotNum / 120).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">Monthly Payments (120 months)</p>
                      <p className="text-lg font-semibold">
                        ${(jackpotNum / 120).toLocaleString(undefined, { maximumFractionDigits: 2 })}/month
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 4: Complete */}
            {drawingStage === 'complete' && (
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

