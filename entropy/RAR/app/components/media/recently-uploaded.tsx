'use client'

import { useEffect, useState } from 'react'
import { Play, Heart, MoreHorizontal } from 'lucide-react'
import { songService } from '@/services/songService'
import { Song } from '@/types/song'
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'

interface RecentlyUploadedProps {
  refreshTrigger?: number
}

export function RecentlyUploaded({ refreshTrigger = 0 }: RecentlyUploadedProps) {
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { playSong, setPlaylist, likeSong } = useAudioPlayer()

  const fetchRecentSongs = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const recentSongs = await songService.getSongs()
      const sortedSongs = recentSongs
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4)
      setSongs(sortedSongs)
    } catch (err) {
      console.error('Error fetching recent songs:', err)
      setError('Failed to load recent songs')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecentSongs()
  }, [refreshTrigger])

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 MB'
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    }
  }

  useEffect(() => {
    if (songs.length > 0) {
      setPlaylist(songs)
    }
  }, [songs, setPlaylist])

  const handlePlaySong = async (song: Song) => {
    await playSong(song)
  }

  const handleLikeSong = async (songId: string) => {
    await likeSong(songId, fetchRecentSongs)
  }

  if (isLoading) {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-4">Recently Uploaded</h2>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center space-x-4 p-2 rounded-md bg-gray-800 animate-pulse">
              <div className="w-10 h-10 bg-gray-700 rounded flex-shrink-0"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-24"></div>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-gray-700 rounded w-20"></div>
              </div>
              <div className="w-20">
                <div className="h-3 bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-4">Recently Uploaded</h2>
        <div className="text-center py-8 text-gray-400">
          <p>{error}</p>
          <button 
            onClick={fetchRecentSongs}
            className="mt-2 text-green-500 hover:text-green-400"
          >
            Try Again
          </button>
        </div>
      </section>
    )
  }

  if (songs.length === 0) {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-4">Recently Uploaded</h2>
        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-700 rounded-lg">
          <p>No songs uploaded yet</p>
          <p className="text-sm mt-1">Be the first to share your music!</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Recently Uploaded</h2>
        <button className="text-gray-400 hover:text-white text-sm font-semibold">
          See all
        </button>
      </div>
      <div className="space-y-2">
        {songs.map((song) => (
          <div 
            key={song.id} 
            className="flex items-center space-x-4 p-3 rounded-md hover:bg-gray-800 transition-all cursor-pointer group"
            onClick={() => handlePlaySong(song)}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded flex items-center justify-center flex-shrink-0">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-white truncate">{song.title}</h4>
              <p className="text-gray-400 text-sm truncate">{song.artist}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-sm truncate">{song.album || 'Single'}</p>
            </div>
            <div className="w-20">
              <p className="text-gray-400 text-sm">{formatTimeAgo(song.created_at)}</p>
            </div>
            <div className="w-16 text-right">
              <p className="text-gray-400 text-sm">{formatFileSize(song.file_size)}</p>
            </div>
            <div className="flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity"
                 onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => handleLikeSong(song.id)}
                className="text-gray-400 hover:text-green-500 transition-colors"
                title="Like song"
              >
                <Heart className="w-4 h-4" />
                {song.likes > 0 && (
                  <span className="text-xs ml-1">{song.likes}</span>
                )}
              </button>
              <button 
                className="text-gray-400 hover:text-white transition-colors"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}