'use client'

import { Card } from "@/components/ui/card"
import { Wallet } from "@/components/wagmi/components/wallet"
import Link from "next/link"
import { Play, Shuffle, Heart, MoreHorizontal, ArrowLeft } from "lucide-react"
import { songService } from '@/services/songService'
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'

interface PlaylistClientProps {
  playlist: any // Replace with proper type
}

export default function PlaylistClient({ playlist }: PlaylistClientProps) {

  const { playSong, setPlaylist } = useAudioPlayer()

  const playEntirePlaylist = () => {
    if (!playlist || playlist.songs.length === 0) return

    const firstSong = playlist.songs[0]
    const audioUrl = songService.getSongUrl(firstSong.file_path)
    const audio = new Audio(audioUrl)
    audio.play().catch(console.error)
  }
  
  const handlePlaySong = (song: any) => {
    setPlaylist(playlist.songs) // Set playlist context
    playSong(song)
  }
  
  
  if (!playlist) {
    return (
      <div className="flex h-full bg-black text-white">
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4">Playlist Not Found</h1>
          <Link href="/" className="text-green-500 hover:text-green-400">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-black text-white">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Playlist Header */}
        <div className="bg-gradient-to-b from-green-900 to-gray-900 p-6 flex items-end space-x-6">
          <div className={`w-48 h-48 ${playlist.color} rounded shadow-2xl flex-shrink-0`}></div>
          <div className="flex-1">
            <p className="text-sm font-semibold">PLAYLIST</p>
            <h1 className="text-5xl font-bold mt-2 mb-4">{playlist.name}</h1>
            <p className="text-gray-300">{playlist.description}</p>
            <div className="flex items-center space-x-2 mt-4 text-sm text-gray-300">
              <span>RAR</span>
              <span>•</span>
              <span>{playlist.songs.length} songs</span>
            </div>
          </div>
        </div>

        {/* Playlist Content */}
        <div className="flex-1 p-6 bg-gradient-to-b from-gray-900 to-black">
          {/* Playlist Controls */}
          <div className="flex items-center space-x-6 mb-8">
            <button 
              onClick={playEntirePlaylist}
              className="bg-green-500 hover:bg-green-400 rounded-full p-4 transition-all hover:scale-105"
            >
              <Play className="w-6 h-6 text-black" />
            </button>
            <button className="text-gray-400 hover:text-white transition-colors">
              <Heart className="w-8 h-8" />
            </button>
            <button className="text-gray-400 hover:text-white transition-colors">
              <MoreHorizontal className="w-8 h-8" />
            </button>
          </div>

          {/* Songs List */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-gray-400 text-sm font-medium border-b border-gray-800">
              <div className="col-span-1">#</div>
              <div className="col-span-5">TITLE</div>
              <div className="col-span-4">ARTIST</div>
              <div className="col-span-2 text-right">DURATION</div>
            </div>
            
            {playlist.songs.map((song: any, index: number) => (
              <div 
                key={song.id} 
                className="grid grid-cols-12 gap-4 px-4 py-2 rounded-md hover:bg-gray-800 transition-all cursor-pointer group"
                onClick={() => handlePlaySong(song)}
              >
                <div className="col-span-1 flex items-center">
                  <span className="text-gray-400 group-hover:hidden">{index + 1}</span>
                  <Play className="w-4 h-4 text-white hidden group-hover:block" />
                </div>
                <div className="col-span-5 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-700 rounded flex-shrink-0"></div>
                  <div>
                    <p className="text-white font-medium">{song.title}</p>
                  </div>
                </div>
                <div className="col-span-4 flex items-center">
                  <p className="text-gray-400">{song.artist}</p>
                </div>
                <div className="col-span-2 flex items-center justify-end space-x-3">
                  <button className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart className="w-4 h-4" />
                  </button>
                  <p className="text-gray-400 text-sm">3:45</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}