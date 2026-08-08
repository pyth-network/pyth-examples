'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, X } from 'lucide-react'
import { songService } from '@/services/songService'
import { randomSeedService } from '@/services/randomSeedService'
import { useUser } from '@/contexts/UserContext'

interface UploadSongProps {
  onUploadSuccess?: () => void
}

export function UploadSong({ onUploadSuccess }: UploadSongProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    album: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { user } = useUser()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {

      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg']
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid audio file (MP3, WAV, FLAC, AAC, OGG)')
        return
      }

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        alert('File size must be less than 50MB')
        return
      }

      setSelectedFile(file)
      setShowForm(true)
      
      // Pre-fill title from filename
      const fileName = file.name.replace(/\.[^/.]+$/, "") // Remove extension
      setFormData(prev => ({
        ...prev,
        title: prev.title || fileName,
        artist: prev.artist || 'Unknown Artist'
      }))
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault()
  
  if (!selectedFile || !formData.title || !formData.artist) {
    alert('Please fill in all required fields and select a file')
    return
  }
    
      setIsUploading(true)
  try {
    await songService.uploadSong({
      ...formData,
      file: selectedFile
    }, user?.id)

      // Reset form
      setFormData({ title: '', artist: '', album: '' })
      setSelectedFile(null)
      setShowForm(false)
      
      alert('Song uploaded successfully!')
      onUploadSuccess?.()
      } catch (error) {
    console.error('Upload failed:', error)
    alert('Upload failed. Please try again.')
  } finally {
    setIsUploading(false)
  }
}
 const handleUploadSuccess = async () => {
  try {
    // Check if we have playlists for today
    const hasPlaylists = await randomSeedService.hasPlaylistsForToday()
    
    if (!hasPlaylists) {
      console.log('First upload today - generating playlists...')
      
      // Step 1: Generate seed (if needed)
      const seedResult = await fetch('/api/generate-daily-seed')
      const seedData = await seedResult.json()
      
      if (seedData.success) {
        console.log('Seed generated, now generating playlists...')
        
        // Step 2: Generate playlists with the seed
        const playlistsResult = await fetch('/api/generate-playlists')
        const playlistsData = await playlistsResult.json()
        
        if (playlistsData.success) {
          console.log('🎵 Daily playlists generated successfully!')
        } else {
          console.error('Failed to generate playlists:', playlistsData.error)
        }
      } else {
        console.error('Failed to generate seed:', seedData.error)
      }
    }
    

    onUploadSuccess?.()
    
  } catch (error) {
    console.error('Error in upload success handler:', error)
  } finally {
    // Reset form
    setFormData({ title: '', artist: '', album: '' })
    setSelectedFile(null)
    setShowForm(false)
  }
}

  if (!showForm) {
    return (
      <Card className="p-6 bg-gray-800 border-gray-700">
        <div className="text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Upload Your Music</h3>
          <p className="text-gray-400 mb-4">Share your songs with the community</p>
          <input
            type="file"
            id="song-upload"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => document.getElementById('song-upload')?.click()}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Select File
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-gray-800 border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Upload Song</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(false)}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Song Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter song title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Artist *
          </label>
          <input
            type="text"
            required
            value={formData.artist}
            onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter artist name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Album
          </label>
          <input
            type="text"
            value={formData.album}
            onChange={(e) => setFormData(prev => ({ ...prev, album: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Enter album name (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Selected File
          </label>
          <div className="text-gray-400 text-sm bg-gray-700 px-3 py-2 rounded-md">
            {selectedFile?.name} ({(selectedFile?.size || 0) / 1024 / 1024 | 0}MB)
          </div>
        </div>

        <div className="flex space-x-3 pt-2">
          <Button
            type="submit"
            disabled={isUploading}
            className="bg-green-500 hover:bg-green-600 text-white flex-1"
          >
            {isUploading ? 'Uploading...' : 'Upload Song'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowForm(false)}
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}