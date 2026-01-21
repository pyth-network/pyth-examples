'use client'

import { useState, useEffect } from 'react'
import { GripVertical, X, Save, RotateCcw, Play } from 'lucide-react'
import { Song } from '@/app/playlist-battle/[id]/types/playlist-battle'

interface RearrangeModalProps {
  isOpen: boolean
  songs: Song[]
  onClose: () => void
  onSave: (reorderedSongIds: string[]) => void
}

export const RearrangeModal = ({
  isOpen,
  songs,
  onClose,
  onSave
}: RearrangeModalProps) => {
  const [reorderedSongs, setReorderedSongs] = useState<Song[]>(songs)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    setReorderedSongs(songs)
  }, [songs])

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null) return

    const newSongs = [...reorderedSongs]
    const [draggedSong] = newSongs.splice(draggedIndex, 1)
    newSongs.splice(dropIndex, 0, draggedSong)

    setReorderedSongs(newSongs)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleReset = () => {
    setReorderedSongs(songs)
  }

  const handleSave = () => {
    const reorderedIds = reorderedSongs.map(song => song.id)
    onSave(reorderedIds)
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-3xl max-h-[80vh] bg-gray-900 rounded-lg shadow-2xl border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Rearrange Playlist</h2>
            <p className="text-gray-400 text-sm mt-1">
              Drag and drop songs to reorder them
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Song List */}
        <div className="flex-1 overflow-y-auto p-6">
          {reorderedSongs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No songs in playlist</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reorderedSongs.map((song, index) => (
                <div
                  key={`${song.id}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-4 p-4 rounded-lg cursor-move
                    transition-all duration-200
                    ${draggedIndex === index 
                      ? 'opacity-50 bg-gray-700' 
                      : 'bg-gray-800 hover:bg-gray-750'
                    }
                    ${dragOverIndex === index && draggedIndex !== index
                      ? 'border-2 border-green-500'
                      : 'border-2 border-transparent'
                    }
                  `}
                >
                  {/* Drag Handle */}
                  <GripVertical className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  
                  {/* Position Number */}
                  <div className="w-8 h-8 flex items-center justify-center bg-gray-700 rounded text-sm font-semibold text-gray-300">
                    {index + 1}
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded flex-shrink-0 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium truncate">{song.title}</p>
                        <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                      </div>
                    </div>
                  </div>

                  {/* Album */}
                  <div className="hidden md:block w-32 text-gray-400 text-sm truncate">
                    {song.album || 'Single'}
                  </div>

                  {/* Duration */}
                  <div className="w-16 text-right text-gray-400 text-sm">
                    {formatDuration(song.duration)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Order
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Order (+2⚡)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}