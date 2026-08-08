'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Play, Heart, Share, ArrowLeft, Users, Clock, Battery } from 'lucide-react'
import { songService } from '@/services/songService'
import { supabase } from '@/lib/supabase'
import { VoteButtons } from '@/components/playlist/VoteButton'
import { GalleryPlaylist } from '@/types/gallery'

export default function GalleryPlaylistPage() {
  const params = useParams()
  const router = useRouter()
  const playlistId = params.id as string
  
  const [playlist, setPlaylist] = useState<GalleryPlaylist | null>(null)
  const [songs, setSongs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSong, setCurrentSong] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPlaylistData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch playlist data
      const response = await fetch(`/api/playlist-battle/gallery/${playlistId}`)
      const data = await response.json()
      
      if (data.success) {
        setPlaylist(data.playlist)
        
        // Load all songs to map IDs to song objects
        const allSongs = await songService.getSongs()
        const songMap = new Map(allSongs.map(song => [song.id, song]))
        
        // Ensure playlist_songs exists and is an array
        const playlistSongs = (data.playlist.playlist_songs || [])
          .map((songId: string) => songMap.get(songId))
          .filter(Boolean)
        
        setSongs(playlistSongs)
        
        // Increment play count when someone views the playlist
        try {
          await supabase.rpc('increment_gallery_play_count', { 
            playlist_id: playlistId 
          })
        } catch (error) {
          console.error('Error incrementing play count:', error)
        }
      } else {
        console.error('Failed to load playlist:', data.error)
        setError('Failed to load playlist')
      }
    } catch (error) {
      console.error('Error loading playlist:', error)
      setError('Error loading playlist')
    } finally {
      setIsLoading(false)
    }
  }, [playlistId])

  useEffect(() => {
    loadPlaylistData()
  }, [loadPlaylistData])

  const handleLike = async () => {
    if (!playlist) return
    
    try {
      await supabase.rpc('increment_gallery_likes', { 
        playlist_id: playlistId 
      })
      // Refresh playlist data to show updated likes
      loadPlaylistData()
    } catch (error) {
      console.error('Error liking playlist:', error)
    }
  }

  const playSong = async (song: any) => {
    try {
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
      await songService.incrementPlayCount(song.id)
    } catch (err) {
      console.error('Error playing song:', err)
      alert('Error playing song. Please try again.')
    }
  }

  const playEntirePlaylist = () => {
    if (songs.length === 0) return
    playSong(songs[0])
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    return `${diffInWeeks}w ago`
  }

  if (isLoading) {
    return (
      <div className="flex h-full bg-black text-white">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-spin">⟳</div>
          <p className="mt-4 text-gray-400">Loading playlist...</p>
        </div>
      </div>
    )
  }

  if (!playlist || error) {
    return (
      <div className="flex h-full bg-black text-white">
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">
            {error ? 'Error Loading Playlist' : 'Playlist Not Found'}
          </h1>
          {error && <p className="text-gray-400 mb-4">{error}</p>}
          <button 
            onClick={() => router.push('/playlist-battle/gallery')}
            className="text-green-500 hover:text-green-400"
          >
            ← Back to Gallery
          </button>
        </div>
      </div>
    )
  }

  const getGradientClass = (colorGradient: string) => {
    if (colorGradient && colorGradient.includes('from-')) {
      return colorGradient
    }
    return 'from-purple-900 to-black'
  }

  return (
    <div className="flex h-full bg-black text-white">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Playlist Header */}
        <div className={`p-6 bg-gradient-to-b ${getGradientClass(playlist.playlist_prompt.color_gradient)} flex items-end space-x-6`}>
          <div className="w-48 h-48 bg-black bg-opacity-30 rounded-lg shadow-2xl flex items-center justify-center flex-shrink-0">
            <div className="text-center">
              <div className="text-4xl mb-2">🎵</div>
              <div className="text-sm text-gray-300">{songs.length} songs</div>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-300">GALLERY PLAYLIST</p>
            <h1 className="text-5xl font-bold mt-2 mb-4">{playlist.playlist_name}</h1>
            <p className="text-gray-300 text-lg">{playlist.playlist_description}</p>
            <div className="flex items-center space-x-2 mt-4 text-sm text-gray-300">
              <span>Battle: {playlist.playlist_prompt.name}</span>
              <span>•</span>
              <span>{songs.length} songs</span>
              <span>•</span>
              <span>{playlist.likes} likes</span>
              <span>•</span>
              <span>{playlist.play_count} plays</span>
            </div>
            
            {/* Add voting section */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <VoteButtons 
                  playlistId={playlist.id}
                  currentVoteCount={playlist.vote_count || 0}
                  playlistOwner={playlist.user.wallet_address}
                  onVoteUpdate={(newCount) => {
                    // Update local state if needed
                    setPlaylist(prev => prev ? { ...prev, vote_count: newCount } : null)
                  }}
                />
              </div>
              
              {/* Display reputation level if available */}
              {playlist.user.reputation_level > 0 && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold">Level {playlist.user.reputation_level}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Playlist Content */}
        <div className="flex-1 p-6 bg-gradient-to-b from-gray-900 to-black">
          {/* Playlist Controls */}
          <div className="flex items-center space-x-6 mb-8">
            <button 
              onClick={playEntirePlaylist}
              className="bg-green-500 hover:bg-green-400 rounded-full p-4 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={songs.length === 0}
            >
              <Play className="w-6 h-6 text-black" />
            </button>
            <button 
              onClick={handleLike}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <Heart className="w-8 h-8" />
              {playlist.likes > 0 && (
                <span className="text-sm ml-1">{playlist.likes}</span>
              )}
            </button>
            <button className="text-gray-400 hover:text-white transition-colors">
              <Share className="w-8 h-8" />
            </button>
          </div>

          {/* Songs List */}
          <div className="space-y-2">
            {songs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-6xl mb-4">🎵</div>
                <h3 className="text-xl font-semibold mb-2">No songs in this playlist</h3>
                <p>This playlist was submitted without any songs</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-gray-400 text-sm font-medium border-b border-gray-800">
                  <div className="col-span-1">#</div>
                  <div className="col-span-6">TITLE</div>
                  <div className="col-span-3">ARTIST</div>
                  <div className="col-span-2 text-right">DURATION</div>
                </div>
                
                {songs.map((song, index) => (
                  <div 
                    key={song.id} 
                    className="grid grid-cols-12 gap-4 px-4 py-3 rounded-md hover:bg-gray-800 transition-all cursor-pointer group"
                    onClick={() => playSong(song)}
                  >
                    <div className="col-span-1 flex items-center">
                      <span className="text-gray-400 group-hover:hidden">{index + 1}</span>
                      <Play className="w-4 h-4 text-white hidden group-hover:block" />
                    </div>
                    <div className="col-span-6 flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded flex-shrink-0 flex items-center justify-center">
                        <Play className="w-3 h-3 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{song.title}</p>
                        <p className="text-gray-400 text-sm truncate">{song.album || 'Single'}</p>
                      </div>
                    </div>
                    <div className="col-span-3 flex items-center">
                      <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                    </div>
                    <div className="col-span-2 flex items-center justify-end space-x-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          songService.likeSong(song.id)
                        }}
                        className="text-gray-400 hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Like song"
                      >
                        <Heart className="w-4 h-4" />
                        {song.likes > 0 && (
                          <span className="text-xs ml-1">{song.likes}</span>
                        )}
                      </button>
                      <p className="text-gray-400 text-sm">{formatDuration(song.duration)}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Player Bar (optional) */}
      {currentSong && (
        <div className="fixed bottom-0 left-64 right-0 bg-gray-900 border-t border-gray-800 p-4 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 w-1/4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm truncate">{currentSong.title}</h4>
                <p className="text-gray-400 text-xs truncate">{currentSong.artist}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center space-y-2 flex-1 max-w-md">
              <div className="flex items-center space-x-4">
                <Play className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center space-x-2 w-full">
                <span className="text-xs text-gray-400">0:00</span>
                <div className="flex-1 bg-gray-600 rounded-full h-1">
                  <div className="bg-white rounded-full h-1 w-1/3"></div>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDuration(currentSong.duration)}
                </span>
              </div>
            </div>

            <div className="w-1/4"></div>
          </div>
        </div>
      )}
    </div>
  )
}