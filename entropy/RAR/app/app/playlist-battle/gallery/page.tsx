'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useAccount } from 'wagmi'
import { Play, Heart, Users, Music, Clock, Filter, Eye, ListMusic } from 'lucide-react'
import { songService } from '@/services/songService'
import { useRouter } from 'next/navigation'
import { GalleryPlaylist } from '@/types/gallery'

export default function PlaylistBattleGallery() {
  const [galleryData, setGalleryData] = useState<Record<string, any>>({})
  const [allSongs, setAllSongs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'my'>('all')
  const { user } = useUser()
  const { address } = useAccount()
  const router = useRouter()

  useEffect(() => {
    const loadGalleryPlaylists = async () => {
      try {
        setIsLoading(true)
        
        let url = '/api/playlist-battle/gallery'
        if (filter === 'my' && address) {
          url += `?userAddress=${address}`
        }
        
        const response = await fetch(url)
        const data = await response.json()
        
        if (data.success) {
          setGalleryData(data.galleryPlaylists)
        }
      } catch (error) {
        console.error('Error loading gallery playlists:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadGalleryPlaylists()
    loadAllSongs()
  }, [filter, address]) 

   const loadAllSongs = async () => {
    try {
      const songs = await songService.getSongs()
      setAllSongs(songs)
    } catch (error) {
      console.error('Error loading songs:', error)
    }
  }

  const getSongMap = () => {
    return new Map(allSongs.map(song => [song.id, song]))
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

  // Get gradient from playlist prompt or use default based on index
  const getCategoryGradient = (prompt: any, promptIndex: number) => {
    if (prompt?.color_gradient && prompt.color_gradient.includes('from-')) {
      return prompt.color_gradient;
    }
    
    // Fallback gradients matching homepage daily mix style
    const fallbackGradients = [
      'from-purple-500 to-blue-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-blue-500 to-cyan-500',
      'from-pink-500 to-rose-500',
      'from-yellow-500 to-amber-500'
    ];
    
    return fallbackGradients[promptIndex % fallbackGradients.length];
  }

  const promptCount = Object.keys(galleryData).length
  const totalPlaylists = Object.values(galleryData).reduce((total: number, group: any) => 
    total + (group.playlists?.length || 0), 0
  )

  if (isLoading) {
    return (
      <div className="flex h-full bg-black text-white">
        <div className="flex-1 p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                <div className="w-full aspect-square bg-gray-700 rounded-md mb-4"></div>
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-black text-white">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Compact Header */}
        <header className="bg-black p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Playlist Gallery
              </h1>
              <p className="text-gray-400 text-sm">
                {totalPlaylists} community playlists
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    filter === 'all' 
                      ? 'bg-purple-600 text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('my')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    filter === 'my' 
                      ? 'bg-purple-600 text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Mine
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-gray-900 to-black">
          {promptCount === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Music className="w-20 h-20 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">
                {filter === 'my' ? 'No Playlists Yet' : 'No Playlists in Gallery'}
              </h3>
              <p className="max-w-md mx-auto">
                {filter === 'my' 
                  ? 'Complete a playlist battle to submit your first creation!' 
                  : 'Be the first to submit a playlist to the gallery!'}
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(galleryData).map(([promptId, group]: [string, any], promptIndex) => {
                const categoryGradient = getCategoryGradient(group.prompt, promptIndex);
                
                return (
                  <section key={promptId} className="mb-8">
                    {/* Compact Section Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${categoryGradient}`}></div>
                        <div>
                          <h2 className="text-xl font-bold text-white">
                            {group.prompt.name}
                          </h2>
                          <p className="text-gray-400 text-sm">{group.playlists.length} playlists</p>
                        </div>
                      </div>
                    </div>

                    {/* Playlist Grid - Using homepage daily mix styling */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {group.playlists.map((playlist: GalleryPlaylist, index: number) => {
                        const songMap = getSongMap()
                        const playlistSongs = playlist.playlist_songs
                          .map(songId => songMap.get(songId))
                          .filter(Boolean)
                        
                        return (
                          <div 
                            key={playlist.id}
                            className="bg-gray-800 bg-opacity-40 p-4 rounded-lg hover:bg-gray-700 transition-all cursor-pointer group"
                            onClick={() => router.push(`/playlist-battle/gallery/${playlist.id}`)}
                          >
                            {/* Card Image/Color Area - Using category gradient */}
                            <div className={`w-full aspect-square rounded-md ${categoryGradient} mb-4 relative overflow-hidden`}>
                              <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 rounded-full p-2 hover:scale-105 shadow-lg">
                                <Play className="w-5 h-5 text-black" />
                              </button>
                            </div>
                            
                            {/* Card Content */}
                            <div>
                              <h3 className="font-semibold mb-1 text-white line-clamp-2">
                                {playlist.playlist_name}
                              </h3>
                              <p className="text-gray-400 text-sm line-clamp-2">
                                by {playlist.user.username}
                              </p>
                              
                              {/* Additional Info */}
                              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                                <span>{playlistSongs.length} songs</span>
                                <span>{formatTimeAgo(playlist.submitted_at)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}