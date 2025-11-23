"use client"

import { SplitFlapCharacter } from "./split-flap-character"
import { cn } from "@/lib/utils"

interface SplitFlapDisplayProps {
  text: string
  maxLength?: number
  className?: string
  startDelay?: number
  disableAnimation?: boolean // Se true, mostra il testo senza animazioni
}

export function SplitFlapDisplay({ 
  text, 
  maxLength = 10, 
  className,
  startDelay = 0,
  disableAnimation = false
}: SplitFlapDisplayProps) {
  // Normalizza il testo: maiuscolo, padding con spazi se necessario
  const normalizedText = text.toUpperCase().padEnd(maxLength, " ").slice(0, maxLength)
  const chars = normalizedText.split("")

  // Se disableAnimation è true, imposta tutti i caratteri immediatamente senza delay
  const effectiveDelay = disableAnimation ? 0 : startDelay

  return (
    <div className={cn("flex flex-row flex-nowrap gap-0.5 items-center justify-center", className)} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap' }}>
      {chars.map((char, index) => (
        <SplitFlapCharacter
          key={index}
          targetChar={char}
          delay={disableAnimation ? 0 : effectiveDelay + index * 50} // Se disableAnimation è true, nessun delay
          disableAnimation={disableAnimation} // Passa la prop per disabilitare completamente l'animazione
        />
      ))}
    </div>
  )
}

