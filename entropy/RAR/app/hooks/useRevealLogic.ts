import { useState, useCallback } from 'react'
import { Song, RevealResult, RevealStats } from '@/app/playlist-battle/[id]/types/playlist-battle'

export const useRevealLogic = (randomSeed: string | undefined, queueSongs: Song[]) => {
  const [revealedQueueSongs, setRevealedQueueSongs] = useState<Song[]>([])
  const [currentSeedIndex, setCurrentSeedIndex] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  const [lastRevealResult, setLastRevealResult] = useState<RevealResult | null>(null)

  const shouldRevealSong = useCallback((): boolean => {
    if (!randomSeed) return false
    
    const seedWithoutPrefix = randomSeed.slice(2)
    if (currentSeedIndex >= seedWithoutPrefix.length) return false
    
    const currentChar = seedWithoutPrefix[currentSeedIndex]
    return /[0-9]/.test(currentChar)
  }, [randomSeed, currentSeedIndex])

  const getCurrentSeedChar = useCallback((): string => {
    if (!randomSeed) return ''
    const seedWithoutPrefix = randomSeed.slice(2)
    return currentSeedIndex < seedWithoutPrefix.length ? seedWithoutPrefix[currentSeedIndex] : 'END'
  }, [randomSeed, currentSeedIndex])

  const getRevealStats = useCallback((): RevealStats => {
    if (!randomSeed) return { numbers: 0, letters: 0, total: 0 }
    
    const seedWithoutPrefix = randomSeed.slice(2)
    const numbers = seedWithoutPrefix.split('').filter(char => /[0-9]/.test(char)).length
    const letters = seedWithoutPrefix.split('').filter(char => /[a-f]/.test(char)).length
    
    return { numbers, letters, total: seedWithoutPrefix.length }
  }, [randomSeed])

  const canFlipMore = randomSeed 
    ? currentSeedIndex < randomSeed.slice(2).length && revealedQueueSongs.length < queueSongs.length
    : false

    const flipCard = useCallback(async () => {
    if (!randomSeed || currentSeedIndex >= randomSeed.slice(2).length) {
      console.log('Seed exhausted')
      return
    }

    if (revealedQueueSongs.length >= queueSongs.length) {
      console.log('All songs revealed')
      return
    }

    setIsFlipping(true)
    setIsCardFlipped(true)

    await new Promise(resolve => setTimeout(resolve, 300))

    const willReveal = shouldRevealSong()
    let result: RevealResult = { revealed: false }

    if (willReveal) {
      const nextSongIndex = revealedQueueSongs.length
      if (nextSongIndex < queueSongs.length) {
        const nextSong = queueSongs[nextSongIndex]
        setRevealedQueueSongs(prev => [...prev, nextSong])
        result = { revealed: true, song: nextSong }
        console.log(`🎵 Revealed song: ${nextSong.title}`)
      }
    } else {
      console.log(`No reveal at index ${currentSeedIndex}`)
    }

    setLastRevealResult(result)
    setCurrentSeedIndex(prev => prev + 1)
    
    // Stop flipping animation but keep card flipped
    setTimeout(() => {
      setIsFlipping(false)
    }, 100)
  }, [randomSeed, currentSeedIndex, revealedQueueSongs, queueSongs, shouldRevealSong])

  // Add function to flip card back to front
  const flipCardBack = useCallback(() => {
    setIsCardFlipped(false)
  }, [])

   const removeSongFromRevealed = useCallback((songId: string) => {
    setRevealedQueueSongs(prev => prev.filter(song => song.id !== songId))
    // Clear the last result and flip card back when song is removed
    setLastRevealResult(null)
    setIsCardFlipped(false)
  }, [])

  const resetRevealState = useCallback(() => {
    setRevealedQueueSongs([])
    setCurrentSeedIndex(0)
    setLastRevealResult(null)
    setIsFlipping(false)
    setIsCardFlipped(false)
  }, [])

return {
    revealedQueueSongs,
    currentSeedIndex,
    isFlipping,
    isCardFlipped, 
    lastRevealResult,
    shouldRevealSong,
    getCurrentSeedChar,
    getRevealStats,
    canFlipMore,
    flipCard,
    flipCardBack, 
    removeSongFromRevealed,
    resetRevealState
  }
}