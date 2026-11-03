'use client'

import { Card } from "@/components/ui/card"
import { Wallet } from "@/components/wagmi/components/wallet"
import { Play, Plus, MoreHorizontal } from "lucide-react"
import { UploadSong } from "@/components/media/upload-song"
import { RecentlyUploaded } from "@/components/media/recently-uploaded"
import { useState, useEffect, useCallback } from 'react'
import { randomSeedService } from '@/services/randomSeedService'
import { usePlaylistBattle } from '@/hooks/usePlaylistBattle'
import { useAccount } from 'wagmi'
import Link from "next/link"
import { playlistGenerationService } from '@/services/playlistGenerationService'
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'

export default function Home() {
  const { startBattle, isLoading, error } = usePlaylistBattle()
  const { isConnected } = useAccount()
  const [showUpload, setShowUpload] = useState(false)
  const [refreshSongs, setRefreshSongs] = useState(0)
  const [playlists, setPlaylists] = useState<any[]>([])
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true)
  const [battlePrompts, setBattlePrompts] = useState<any[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true)
  const [isGeneratingPlaylists, setIsGeneratingPlaylists] = useState(false)
  const { playSong, setPlaylist } = useAudioPlayer()

  const handlePlaySong = async (song: any) => {
    await playSong(song)
  }

  const handlePlayPlaylist = (songs: any[]) => {
    setPlaylist(songs)
    if (songs.length > 0) {
      playSong(songs[0])
    }
  }

  const getFallbackPrompts = useCallback(() => {
    return [
      {
        id: 'temp-1',
        name: 'Workout Energy Mix',
        description: 'High-energy tracks to fuel your session',
        color_gradient: 'from-purple-600 to-blue-600'
      },
      {
        id: 'temp-2',
        name: 'Chill Vibes Only',
        description: 'Relaxing beats for your downtime',
        color_gradient: 'from-green-600 to-emerald-600'
      },
      {
        id: 'temp-3',
        name: 'Party Starters',
        description: 'Get the celebration going',
        color_gradient: 'from-orange-600 to-red-600'
      },
      {
        id: 'temp-4',
        name: 'Focus Flow',
        description: 'Deep concentration soundtrack',
        color_gradient: 'from-blue-600 to-cyan-600'
      }
    ]
  }, [])

  const loadTodaysPlaylists = useCallback(async () => {
    try {
      setIsLoadingPlaylists(true)
      const todaysPlaylists = await randomSeedService.getTodaysPlaylists()
      setPlaylists(todaysPlaylists)
    } catch (error) {
      console.error('Error loading playlists:', error)
      setPlaylists(randomSeedService.getFallbackPlaylists())
    } finally {
      setIsLoadingPlaylists(false)
    }
  }, [])

  const loadBattlePrompts = useCallback(async () => {
    try {
      setIsLoadingPrompts(true)
      const response = await fetch('/api/playlist-battle/prompts')
      const data = await response.json()
      
      if (data.success && data.prompts.length > 0) {
        setBattlePrompts(data.prompts)
        console.log('Loaded battle prompts:', data.prompts)
      } else {
        console.warn('No prompts found, using fallback')
        setBattlePrompts(getFallbackPrompts())
      }
    } catch (error) {
      console.error('Error loading battle prompts:', error)
      setBattlePrompts(getFallbackPrompts())
    } finally {
      setIsLoadingPrompts(false)
    }
  }, [getFallbackPrompts]) // Added dependency

const generatePlaylistsOnStartup = useCallback(async () => {
  setIsGeneratingPlaylists(true)
  try {
    await playlistGenerationService.ensurePlaylistsGenerated()
  } catch (error) {
    console.error('Error generating playlists on startup:', error)
  } finally {
    setIsGeneratingPlaylists(false)
    await loadTodaysPlaylists()
    await loadBattlePrompts()
  }
}, [loadTodaysPlaylists, loadBattlePrompts])
  


  useEffect(() => {
  if (isConnected) {
    const today = new Date().toISOString().split('T')[0]
    const lastGenerated = localStorage.getItem('playlistsLastGenerated')
    
    const initialize = async () => {
      // Only generate once per day
      if (lastGenerated !== today) {
        console.log('Generating playlists for today...')
        await generatePlaylistsOnStartup()
        localStorage.setItem('playlistsLastGenerated', today)
      } else {
        console.log('Playlists already generated today, loading...')
        await loadTodaysPlaylists()
        await loadBattlePrompts()
      }
    }
    
    initialize()
  }
}, [isConnected, generatePlaylistsOnStartup, loadTodaysPlaylists, loadBattlePrompts])
 

  const handleUploadSuccess = () => {
    setRefreshSongs(prev => prev + 1)
    setShowUpload(false)
  }

  const handleStartBattle = async (promptId: string) => {
    console.log('Starting battle with prompt ID:', promptId)
    await startBattle(promptId)
  }

  // Show wallet connection if not connected
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-screen bg-black text-white">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Connect your wallet to listen to music on RAR</p>
          <Wallet />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Show loading state during initial playlist generation */}
      {isGeneratingPlaylists && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg flex items-center space-x-4">
            <div className="animate-spin">⟳</div>
            <span>Generating today&apos;s playlists...</span>
          </div>
        </div>
      )}

      {showUpload ? (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Upload Your Music</h1>
            <button 
              onClick={() => setShowUpload(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Back to Home
            </button>
          </div>
          <div className="max-w-2xl">
            <UploadSong onUploadSuccess={handleUploadSuccess} />
          </div>
        </section>
      ) : (
        <>
          {/* Playlist Battle Section */}
          <section className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Play a fun little game of Playlisting 😃</h1>
            <p className="text-gray-400 mb-6">You never know what song you will find next ;)</p>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded mb-4">
                {error}
              </div>
            )}
            
            {isLoadingPrompts ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gray-800 rounded-md h-32 animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {battlePrompts.map((prompt) => (
                  <button 
                    key={prompt.id}
                    onClick={() => handleStartBattle(prompt.id)}
                    disabled={isLoading}
                    className={`bg-gradient-to-r ${prompt.color_gradient} rounded-md flex items-center overflow-hidden hover:scale-105 transition-all cursor-pointer group p-4 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="w-16 h-16 bg-black bg-opacity-20 flex items-center justify-center flex-shrink-0">
                      {isLoading ? (
                        <div className="animate-spin">⟳</div>
                      ) : (
                        <Play className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="p-4 flex-1">
                      <h3 className="font-semibold">{prompt.name}</h3>
                      <p className="text-gray-200 text-sm">{prompt.description}</p>
                    </div>
                    {isLoading ? (
                      <div className="mr-4 animate-spin">⟳</div>
                    ) : (
                      <div className="mr-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-2 hover:scale-105">
                        <Play className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Some Random Playlist 4 U</h2>
              <button className="text-gray-400 hover:text-white text-sm font-semibold">
                Show all
              </button>
            </div>
            <div className="grid grid-cols-5 gap-6">
                {playlists.map((playlist) => (
                <Link 
                  key={playlist.id} 
                  href={`/playlist/${playlist.id}`}
                  className="block"
                >
                  <div className="bg-gray-800 bg-opacity-40 p-4 rounded-lg hover:bg-gray-700 transition-all cursor-pointer group">
                    <div className={`w-full aspect-square rounded-md ${playlist.color} mb-4 relative overflow-hidden`}>
                      <button onClick={() => handlePlayPlaylist(playlist.songs || [])} className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-green-500 rounded-full p-2 hover:scale-105 shadow-lg">
                        <Play className="w-5 h-5 text-black" />
                      </button>
                    </div>
                    <h3 className="font-semibold mb-1">{playlist.name}</h3>
                    <p className="text-gray-400 text-sm">{playlist.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <RecentlyUploaded refreshTrigger={refreshSongs} />
        </>
      )}
    </div>
  )
}