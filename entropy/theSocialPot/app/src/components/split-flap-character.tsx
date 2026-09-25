"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface SplitFlapCharacterProps {
  targetChar: string
  delay?: number
  className?: string
  disableAnimation?: boolean // Se true, imposta il carattere immediatamente senza animazione
}

// Caratteri disponibili nel display split-flap
const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!*-@#%$/\\&()?+".split("")

export function SplitFlapCharacter({ targetChar, delay = 0, className, disableAnimation = false }: SplitFlapCharacterProps) {
  const [currentChar, setCurrentChar] = useState(" ")
  const [nextChar, setNextChar] = useState(" ")
  const [isFlipping, setIsFlipping] = useState(false)

  useEffect(() => {
    // Se disableAnimation è true, imposta il carattere immediatamente senza animazione
    if (disableAnimation) {
      setCurrentChar(targetChar || " ")
      setNextChar(targetChar || " ")
      setIsFlipping(false)
      return
    }

    if (targetChar === currentChar && !isFlipping) return

    const timer = setTimeout(() => {
      // Simula il flip attraverso vari caratteri
      const currentIndex = CHARS.indexOf(currentChar)
      const targetIndex = CHARS.indexOf(targetChar.toUpperCase())
      
      if (currentIndex === -1 || targetIndex === -1) {
        // Se il carattere non è nella lista, usa uno spazio
        setCurrentChar(targetChar || " ")
        setNextChar(targetChar || " ")
        setIsFlipping(false)
        return
      }

      // Calcola il percorso più breve (avanti o indietro)
      let path: number[]
      const forward = (targetIndex - currentIndex + CHARS.length) % CHARS.length
      const backward = (currentIndex - targetIndex + CHARS.length) % CHARS.length
      
      if (forward <= backward) {
        path = Array.from({ length: forward + 1 }, (_, i) => (currentIndex + i) % CHARS.length)
      } else {
        path = Array.from({ length: backward + 1 }, (_, i) => (currentIndex - i + CHARS.length) % CHARS.length)
      }

      // Anima attraverso i caratteri con effetto flip
      path.forEach((charIndex, index) => {
        setTimeout(() => {
          if (index < path.length - 1) {
            // Durante il flip, mostra il prossimo carattere
            const nextIndex = path[index + 1]
            setNextChar(CHARS[nextIndex])
            setIsFlipping(true)
            
            // Completa il flip dopo un breve delay
            setTimeout(() => {
              setCurrentChar(CHARS[charIndex])
              setIsFlipping(false)
            }, 150)
          } else {
            // Ultimo carattere - completa il flip
            setNextChar(CHARS[charIndex])
            setIsFlipping(true)
            
            setTimeout(() => {
              setCurrentChar(CHARS[charIndex])
              setIsFlipping(false)
            }, 150)
          }
        }, index * 80) // 80ms per carattere
      })
    }, delay)

    return () => clearTimeout(timer)
  }, [targetChar, currentChar, isFlipping, delay, disableAnimation])

  const displayChar = currentChar === " " ? "\u00A0" : currentChar
  const displayNextChar = nextChar === " " ? "\u00A0" : nextChar

  return (
    <div
      className={cn(
        "relative inline-block w-12 h-16 bg-black",
        "flex-shrink-0",
        "overflow-hidden",
        className
      )}
      style={{ 
        display: 'inline-block', 
        verticalAlign: 'middle',
        lineHeight: 0
      }}
    >
      {/* Pivot points ai lati (come nell'immagine) */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-3 h-3 bg-gray-800 rounded-full border border-gray-700 z-20" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 w-3 h-3 bg-gray-800 rounded-full border border-gray-700 z-20" />
      
      {/* Linea orizzontale che collega i pivot points - al centro del carattere */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-gray-800 z-10" />

      {/* Container principale per le due metà sovrapposte */}
      <div className="absolute inset-0 bg-black">
        {/* Metà superiore - perfettamente allineata */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-1/2",
            "bg-gradient-to-b from-gray-200 to-gray-300",
            "flex items-center justify-center",
            "border-b-2 border-gray-600",
            "transition-transform duration-150 ease-in-out",
            isFlipping && "-translate-y-full"
          )}
          style={{ 
            transformOrigin: 'bottom center'
          }}
        >
          <span className="text-2xl font-bold text-gray-800 select-none leading-none">
            {displayChar}
          </span>
        </div>
        
        {/* Metà inferiore - perfettamente allineata */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-1/2",
            "bg-gradient-to-b from-gray-300 to-gray-400",
            "flex items-center justify-center",
            "transition-transform duration-150 ease-in-out",
            isFlipping && "translate-y-full"
          )}
          style={{ 
            transformOrigin: 'top center'
          }}
        >
          <span className="text-2xl font-bold text-gray-800 select-none leading-none">
            {isFlipping ? displayNextChar : displayChar}
          </span>
        </div>
      </div>

      {/* Ombre sottili per effetto 3D */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-b from-white/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
    </div>
  )
}

