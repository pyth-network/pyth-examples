'use client'

import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react'
import { Song } from '@/types/song'
import { songService } from '@/services/songService'

interface AudioPlayerContextType {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playSong: (song: Song) => Promise<void>
  pauseSong: () => void
  resumeSong: () => void
  nextSong: () => void
  previousSong: () => void
  seekTo: (time: number) => void
  setVolume: (volume: number) => void
  likeSong: (songId: string, onSuccess?: () => void) => Promise<void>
  playlist: Song[]
  setPlaylist: (songs: Song[]) => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined)

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.7)
  const [playlist, setPlaylist] = useState<Song[]>([])
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentSongIndexRef = useRef(0)

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = volume

    const audio = audioRef.current

    // Event listeners
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      // Auto-play next song if available
      if (playlist.length > 0) {
        nextSong()
      }
    }
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }
    const handleError = (e: ErrorEvent) => {
      console.error('Audio error:', e)
      setIsPlaying(false)
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('error', handleError as any)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('error', handleError as any)
      audio.pause()
      audio.src = ''
    }
  }, [playlist])

  const playSong = async (song: Song) => {
    try {
      if (!audioRef.current) return

      // Increment play count
      await songService.incrementPlayCount(song.id)

      // Get audio URL
      const audioUrl = songService.getSongUrl(song.file_path)

      // Update audio source
      audioRef.current.src = audioUrl
      audioRef.current.load()

      // Update current song
      setCurrentSong(song)
      setCurrentTime(0)

      // Find song index in playlist
      const songIndex = playlist.findIndex(s => s.id === song.id)
      if (songIndex !== -1) {
        currentSongIndexRef.current = songIndex
      }

      // Play audio
      await audioRef.current.play()
    } catch (err) {
      console.error('Error playing song:', err)
    }
  }

  const pauseSong = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
    }
  }

  const resumeSong = () => {
    if (audioRef.current && !isPlaying && currentSong) {
      audioRef.current.play().catch(console.error)
    }
  }

  const nextSong = () => {
    if (playlist.length === 0) return

    const nextIndex = (currentSongIndexRef.current + 1) % playlist.length
    currentSongIndexRef.current = nextIndex
    playSong(playlist[nextIndex])
  }

  const previousSong = () => {
    if (playlist.length === 0) return

    // If more than 3 seconds into song, restart it
    if (currentTime > 3) {
      seekTo(0)
      return
    }

    const prevIndex = currentSongIndexRef.current - 1 < 0 
      ? playlist.length - 1 
      : currentSongIndexRef.current - 1
    currentSongIndexRef.current = prevIndex
    playSong(playlist[prevIndex])
  }

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const setVolume = (vol: number) => {
    const clampedVolume = Math.max(0, Math.min(1, vol))
    setVolumeState(clampedVolume)
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume
    }
  }

  const likeSong = async (songId: string, onSuccess?: () => void) => {
    try {
      await songService.likeSong(songId)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('Error liking song:', err)
    }
  }

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        playSong,
        pauseSong,
        resumeSong,
        nextSong,
        previousSong,
        seekTo,
        setVolume,
        likeSong,
        playlist,
        setPlaylist,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  )
}

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext)
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider')
  }
  return context
}