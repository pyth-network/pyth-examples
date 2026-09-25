'use client'

import { Play, Pause, Heart, Shuffle, SkipBack, SkipForward, Repeat, Volume2, VolumeX } from "lucide-react"
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'
import { useState, useEffect } from 'react'

export function PlayerBar() {
  const {
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
  } = useAudioPlayer()

  const [isMuted, setIsMuted] = useState(false)
  const [previousVolume, setPreviousVolume] = useState(volume)

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseSong()
    } else if (currentSong) {
      resumeSong()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    seekTo(time)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    if (vol > 0) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (isMuted) {
      setVolume(previousVolume)
      setIsMuted(false)
    } else {
      setPreviousVolume(volume)
      setVolume(0)
      setIsMuted(true)
    }
  }

  const handleLike = async () => {
    if (currentSong) {
      await likeSong(currentSong.id)
    }
  }

  // Don't render if no song is loaded
  if (!currentSong) {
    return null
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 z-50">
      <div className="flex items-center justify-between">
        {/* Current Song Info */}
        <div className="flex items-center space-x-4 w-1/4 min-w-0">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded flex-shrink-0 flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm truncate text-white">{currentSong.title}</h4>
            <p className="text-gray-400 text-xs truncate">{currentSong.artist}</p>
          </div>
          <button 
            onClick={handleLike}
            className="text-gray-400 hover:text-green-500 transition-colors flex-shrink-0"
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center space-y-2 flex-1 max-w-2xl">
          <div className="flex items-center space-x-4">
            <button className="text-gray-400 hover:text-white transition-colors">
              <Shuffle className="w-4 h-4" />
            </button>
            <button 
              onClick={previousSong}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button 
              onClick={handlePlayPause}
              className="bg-white rounded-full p-2 hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-black" />
              ) : (
                <Play className="w-4 h-4 text-black" />
              )}
            </button>
            <button 
              onClick={nextSong}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button className="text-gray-400 hover:text-white transition-colors">
              <Repeat className="w-4 h-4" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-2 w-full">
            <span className="text-xs text-gray-400 w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <div className="flex-1 relative group">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:bg-white
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:opacity-0
                  group-hover:[&::-webkit-slider-thumb]:opacity-100
                  [&::-webkit-slider-thumb]:transition-opacity"
                style={{
                  background: `linear-gradient(to right, white ${progressPercentage}%, #4B5563 ${progressPercentage}%)`
                }}
              />
            </div>
            <span className="text-xs text-gray-400 w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2 w-1/4 justify-end">
          <button 
            onClick={toggleMute}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <div className="relative group w-20">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-gray-600 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:opacity-0
                group-hover:[&::-webkit-slider-thumb]:opacity-100
                [&::-webkit-slider-thumb]:transition-opacity"
              style={{
                background: `linear-gradient(to right, white ${volume * 100}%, #4B5563 ${volume * 100}%)`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}