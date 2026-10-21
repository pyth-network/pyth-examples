"use client"

import { SplitFlapRoller } from "./split-flap-roller"
import { cn } from "@/lib/utils"

interface TicketCode {
  id: string
  code: string
}

interface SplitFlapBoardProps {
  tickets: TicketCode[]
  isAnimating?: boolean
  winnerTicketId?: string | null
  showWinnerStatic?: boolean // Se true, mostra il vincitore senza animazioni
  className?: string
}

// Genera un codice di 8 caratteri alfanumerici da un ID di biglietto
function generateTicketCode(ticketId: string): string {
  // Prendi l'hash dall'ID del biglietto (rimuovi caratteri non alfanumerici)
  const hash = ticketId.replace(/[^a-f0-9]/gi, "")
  
  if (hash.length === 0) {
    // Fallback: genera un codice casuale di 8 caratteri
    return Math.random().toString(36).substring(2, 10).toUpperCase().padEnd(8, '0').slice(0, 8)
  }
  
  // Prendi i primi 8 caratteri dell'hash e convertili in maiuscolo
  // Se l'hash è più corto, riempi con caratteri dall'inizio
  let code = hash.toUpperCase()
  if (code.length < 8) {
    // Ripeti l'hash fino a raggiungere 8 caratteri
    code = (code.repeat(Math.ceil(8 / code.length))).slice(0, 8)
  } else {
    code = code.slice(0, 8)
  }
  
  return code
}

export function SplitFlapBoard({ tickets, isAnimating = false, winnerTicketId = null, showWinnerStatic = false, className }: SplitFlapBoardProps) {
  return (
    <SplitFlapRoller
      tickets={tickets}
      winnerTicketId={winnerTicketId}
      isAnimating={isAnimating}
      showWinnerStatic={showWinnerStatic}
      className={className}
    />
  )
}

