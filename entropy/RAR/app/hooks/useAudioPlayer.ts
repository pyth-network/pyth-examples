import { useState } from 'react'
import { Song } from '@/app/playlist-battle/[id]/types/playlist-battle'
import { songService } from '@/services/songService'

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)

  const playSong = async (song: Song) => {
    try {
      await songService.incrementPlayCount(song.id)
      
      const audioUrl = songService.getSongUrl(song.file_path)
      const audio = new Audio(audioUrl)
      
      audio.onplay = () => {
        setIsPlaying(true)
        setCurrentSong(song)
      }
      
      audio.onpause = () => {
        setIsPlaying(false)
      }
      
      audio.onended = () => {
        setIsPlaying(false)
        setCurrentSong(null)
      }
      
      await audio.play()
    } catch (err) {
      console.error('Error playing song:', err)
      alert('Error playing song. Please try again.')
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

  return {
    isPlaying,
    currentSong,
    playSong,
    likeSong
  }
}