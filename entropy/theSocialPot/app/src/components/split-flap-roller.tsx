"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface SplitFlapRollerProps {
  tickets: Array<{ id: string; code: string }>
  winnerTicketId?: string | null
  isAnimating?: boolean
  showWinnerStatic?: boolean
  className?: string
}

// Genera un codice di 8 caratteri alfanumerici da un ID di biglietto
function generateTicketCode(ticketId: string): string {
  const hash = ticketId.replace(/[^a-f0-9]/gi, "")
  
  if (hash.length === 0) {
    return Math.random().toString(36).substring(2, 10).toUpperCase().padEnd(8, '0').slice(0, 8)
  }
  
  let code = hash.toUpperCase()
  if (code.length < 8) {
    code = (code.repeat(Math.ceil(8 / code.length))).slice(0, 8)
  } else {
    code = code.slice(0, 8)
  }
  
  return code
}

export function SplitFlapRoller({ 
  tickets, 
  winnerTicketId = null, 
  isAnimating = false,
  showWinnerStatic = false,
  className 
}: SplitFlapRollerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const animationRef = useRef<number>()

  // Prepara tutti i codici dei ticket
  const allCodes = tickets.map(t => generateTicketCode(t.id))
  const winnerCode = winnerTicketId ? generateTicketCode(winnerTicketId) : null

  useEffect(() => {
    // Se showWinnerStatic è true, mostra immediatamente il vincitore
    if (showWinnerStatic && winnerCode) {
      setCurrentIndex(-1)
      // Se ci sono codici, scrolla fino al vincitore (che è dopo tutti i codici)
      // Altrimenti mostra direttamente il vincitore
      setScrollOffset(allCodes.length > 0 ? -allCodes.length * 100 : 0)
      setIsScrolling(false)
      return
    }

    // Se non stiamo animando
    if (!isAnimating) {
      setIsScrolling(false)
      // Se c'è un vincitore e non stiamo animando, mostralo
      if (winnerCode) {
        setCurrentIndex(-1)
        setScrollOffset(allCodes.length > 0 ? -allCodes.length * 100 : 0)
      } else if (tickets.length === 0) {
        // Se non ci sono ticket, mostra spazi vuoti
        setCurrentIndex(0)
        setScrollOffset(0)
      }
      return
    }

    // Se non ci sono ticket, non animare
    if (tickets.length === 0) {
      setIsScrolling(false)
      return
    }

    setIsScrolling(true)
    let index = 0
    let cycleCount = 0
    const maxCycles = 2

    const scrollToNext = () => {
      if (index < allCodes.length) {
        setCurrentIndex(index)
        setScrollOffset(-index * 100) // Ogni codice è al 100% di altezza
        index++
      } else {
        cycleCount++
        if (cycleCount < maxCycles) {
          index = 0
          setCurrentIndex(0)
          setScrollOffset(0)
        } else {
          // Fine animazione, mostra il vincitore
          setIsScrolling(false)
          if (winnerCode) {
            setTimeout(() => {
              setCurrentIndex(-1)
              setScrollOffset(-allCodes.length * 100) // Scroll fino al vincitore
            }, 300)
          }
          return
        }
      }
    }

    // Inizia lo scroll
    setCurrentIndex(0)
    setScrollOffset(0)
    const interval = setInterval(scrollToNext, 500) // Cambia ogni 500ms per effetto più veloce

    return () => {
      clearInterval(interval)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [tickets, isAnimating, winnerTicketId, showWinnerStatic, allCodes, winnerCode])

  const displayCode = currentIndex === -1 && winnerCode 
    ? winnerCode.padEnd(8, " ").slice(0, 8)
    : currentIndex < allCodes.length 
      ? allCodes[currentIndex]?.padEnd(8, " ").slice(0, 8) || "        "
      : "        "

  return (
    <div
      className={cn(
        "bg-black rounded-lg p-8",
        "border-2 shadow-2xl transition-all duration-500",
        currentIndex === -1 && winnerCode
          ? "border-green-500/50 shadow-green-500/20" 
          : "border-gray-800",
        className
      )}
    >
      {/* Display con effetto rullo */}
      <div className="flex justify-center items-center py-12 w-full overflow-hidden">
        <div className="relative w-full max-w-[400px] h-16 overflow-hidden bg-black">
          {/* Container che scorre verticalmente */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col transition-transform duration-300",
              isScrolling ? "ease-out" : "ease-in-out"
            )}
            style={{
              transform: currentIndex === -1 && winnerCode
                ? `translateY(${allCodes.length > 0 ? -allCodes.length * 100 : -100}%)`
                : `translateY(${scrollOffset}%)`,
            }}
          >
            {/* Mostra tutti i codici in una colonna che scorre */}
            {allCodes.length > 0 ? (
              allCodes.map((code, idx) => {
                const paddedCode = code.padEnd(8, " ").slice(0, 8)
                return (
                  <div key={idx} className="h-16 flex-shrink-0 flex items-center justify-center">
                    <RollingDisplay text={paddedCode} />
                  </div>
                )
              })
            ) : (
              // Se non ci sono codici, mostra uno spazio vuoto per mantenere l'altezza
              <div className="h-16 flex-shrink-0 flex items-center justify-center">
                <RollingDisplay text="        " />
              </div>
            )}
            {/* Codice vincitore alla fine */}
            {winnerCode && (
              <div className="h-16 flex-shrink-0 flex items-center justify-center">
                <RollingDisplay text={winnerCode.padEnd(8, " ").slice(0, 8)} isWinner={true} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Indicatore */}
      {tickets.length > 0 && (
        <div className="mt-4 text-center">
          {currentIndex === -1 && winnerCode ? (
            <div className="inline-block bg-green-500/10 px-4 py-2 rounded border border-green-500/30">
              <span className="text-green-400 font-mono text-sm font-semibold uppercase tracking-wider">
                Winner
              </span>
            </div>
          ) : isAnimating && currentIndex >= 0 ? (
            <div className="inline-block bg-gray-900/50 px-3 py-1 rounded border border-gray-800">
              <span className="text-gray-400 font-mono text-xs">
                Ticket {currentIndex + 1} / {tickets.length}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

// Componente per mostrare un codice con effetto split-flap
function RollingDisplay({ text, isWinner = false }: { text: string; isWinner?: boolean }) {
  const chars = text.split("")

  return (
    <div className="flex flex-row flex-nowrap gap-0.5 items-center justify-center">
      {chars.map((char, index) => (
        <div
          key={index}
          className={cn(
            "relative inline-block w-12 h-16 bg-black flex-shrink-0 overflow-hidden",
            isWinner && "ring-2 ring-green-500/50"
          )}
        >
          {/* Pivot points */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-3 h-3 bg-gray-800 rounded-full border border-gray-700 z-20" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 w-3 h-3 bg-gray-800 rounded-full border border-gray-700 z-20" />
          
          {/* Linea centrale */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-gray-800 z-10" />

          {/* Due metà sovrapposte */}
          <div className="absolute inset-0">
            {/* Metà superiore */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center border-b-2 border-gray-600">
              <span className="text-2xl font-bold text-gray-800 select-none leading-none">
                {char === " " ? "\u00A0" : char}
              </span>
            </div>
            
            {/* Metà inferiore */}
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-b from-gray-300 to-gray-400 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-800 select-none leading-none">
                {char === " " ? "\u00A0" : char}
              </span>
            </div>
          </div>

          {/* Ombre */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-b from-white/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        </div>
      ))}
    </div>
  )
}

