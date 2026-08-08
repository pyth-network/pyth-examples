import { useState, useEffect } from 'react'
import { BattleInstance, Song } from '@/app/playlist-battle/[id]/types/playlist-battle'

export const useBattleInstance = (battleId: string) => {
  const [battleInstance, setBattleInstance] = useState<BattleInstance | null>(null)
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([])
  const [queueSongs, setQueueSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadBattleInstance = async () => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/playlist-battle/${battleId}`)
      const data = await response.json()
      
      if (data.success) {
        setBattleInstance(data.battleInstance)
        setPlaylistSongs(data.playlistSongs || [])
        setQueueSongs(data.queueSongs || [])
      } else {
        console.error('Failed to load battle instance:', data.error)
      }
    } catch (error) {
      console.error('Error loading battle instance:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addSongToPlaylist = async (songId: string) => {
  try {
    const response = await fetch(`/api/playlist-battle/${battleId}/add-song`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId })
    })
    
    const data = await response.json()
    if (data.success) {
      setBattleInstance(data.updatedBattle)
      setPlaylistSongs(data.playlistSongs || [])
      setQueueSongs(data.queueSongs || [])
      console.log('Added song to playlist and consumed 5 energy')
      return true
    } else {
      console.error('Failed to add song:', data.error)
      return false
    }
  } catch (error) {
    console.error('Error adding song to playlist:', error)
    return false
  }
}

  const passSong = async (songId: string) => {
    try {
      const response = await fetch(`/api/playlist-battle/${battleId}/pass-song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId })
      })
      
      const data = await response.json()
      if (data.success) {
        setBattleInstance(data.updatedBattle)
        setQueueSongs(data.queueSongs || [])
        console.log('Passed song and removed from queue')
        return true
      } else {
        console.error('Failed to pass song:', data.error)
        return false
      }
    } catch (error) {
      console.error('Error passing song:', error)
      return false
    }
  }
  
  // UPDATED: Now accepts optional songOrder parameter
  const rearrangePlaylist = async (songOrder?: string[]): Promise<boolean> => {
    try {
      const response = await fetch(`/api/playlist-battle/${battleId}/rearrange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songOrder }) 
      })
      
      const data = await response.json()
      if (data.success) {
        setBattleInstance(data.updatedBattle)
        // Update playlist songs with the new order
        if (data.updatedBattle.playlist_songs) {
          await loadBattleInstance() 
        }
        console.log('Playlist rearranged and gained 2 energy')
        return true
      } else {
        console.error('Failed to rearrange playlist:', data.error)
        return false
      }
    } catch (error) {
      console.error('Error rearranging playlist:', error)
      return false
    }
  }

  const pause = async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/playlist-battle/${battleId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      const data = await response.json()
      if (data.success) {
        setBattleInstance(data.updatedBattle)
        console.log('Paused and gained 5 energy')
        return true
      } else {
        console.error('Failed to pause:', data.error)
        return false
      }
    } catch (error) {
      console.error('Error during pause:', error)
      return false
    }
  }

  useEffect(() => {
    loadBattleInstance()
  }, [battleId])

  return {
    battleInstance,
    playlistSongs,
    queueSongs,
    isLoading,
    loadBattleInstance,
    addSongToPlaylist,
    passSong,
    rearrangePlaylist,
    pause
  }
}