'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useBattleInstance } from '@/hooks/useBattleInstance'
import { useRevealLogic } from '@/hooks/useRevealLogic'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { SidebarContainer } from '@/app/playlist-battle/[id]/components/Sidebar/SidebarContainer'
import { PlaylistHeader } from '@/app/playlist-battle/[id]/components/MainContent/PlaylistHeader'
import { SongsList } from '@/app/playlist-battle/[id]/components/MainContent/SongList'
import { RearrangeModal } from '@/app/playlist-battle/[id]/RearrangeModal'
import { useBattleEnergy } from '@/hooks/useBattleEnergy'
import { useAccount } from 'wagmi'
import { useUser } from '@/contexts/UserContext'

interface PlaylistBattlePageProps {
  params: {
    id: string
  }
}

export default function PlaylistBattlePage({ params }: PlaylistBattlePageProps) {
  const router = useRouter()
  const { address } = useAccount()
  const { user } = useUser()
 
  
  const [isRearrangeModalOpen, setIsRearrangeModalOpen] = useState(false)

  const {
    battleInstance,
    playlistSongs,
    queueSongs,
    isLoading,
    loadBattleInstance,
    addSongToPlaylist,
    passSong,
    rearrangePlaylist,
    pause
  } = useBattleInstance(params.id)

  const {
    revealedQueueSongs,
    currentSeedIndex,
    isFlipping,
    isCardFlipped,
    lastRevealResult,
    shouldRevealSong,
    getCurrentSeedChar,
    getRevealStats,
    canFlipMore,
    flipCard,
    flipCardBack,
    removeSongFromRevealed,
    resetRevealState
  } = useRevealLogic(battleInstance?.random_seed, queueSongs)
  
  const { isPlaying, currentSong, playSong, likeSong } = useAudioPlayer()
  const { energyUnits, consumeEnergy, canAddSong, canPassSong, isLoading: energyLoading } = useBattleEnergy(battleInstance)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddToPlaylist = async (songId: string) => {
    if (!canAddSong) {
      alert('Not enough energy to add song! Need 5 energy units.')
      return
    }

    const success = await addSongToPlaylist(songId)
    if (success) {
      
      removeSongFromRevealed(songId)
      console.log('Added song to playlist and consumed 5 energy')
    } else {
      alert('Failed to add song. Please try again.')
    }
  }

  const handlePassSong = async (songId: string) => {
    if (!canPassSong) {
      alert('Not enough energy to pass song! Need 3 energy units.')
      return
    }

    const success = await passSong(songId)
    if (success) {
      
      removeSongFromRevealed(songId)
      console.log('Passed song and consumed 3 energy')
    } else {
      alert('Failed to pass song. Please try again.')
    }
  }
  
  const handleOpenRearrangeModal = () => {
    if (playlistSongs.length === 0) {
      alert('Add songs to playlist first to rearrange')
      return
    }
    setIsRearrangeModalOpen(true)
  }

  const handleSaveRearrange = async (reorderedSongIds: string[]) => {
    const success = await rearrangePlaylist(reorderedSongIds)
    if (success) {
     
      setIsRearrangeModalOpen(false)
      flipCardBack()
      console.log('Playlist rearranged and gained 2 energy')
    } else {
      alert('Failed to rearrange playlist. Please try again.')
    }
  }

  const handlePause = async () => {
    const success = await pause()
    if (success) {
      
      flipCardBack()
      console.log('Paused and gained 5 energy')
    } else {
      alert('Failed to pause. Please try again.')
    }
  }

  const handleLikeSong = (songId: string) => {
    likeSong(songId, loadBattleInstance)
  }

  const handlePlayAll = () => {
    if (playlistSongs.length > 0) {
      playSong(playlistSongs[0])
    }
  }

  const handleSubmitToGallery = async () => {
    if (!battleInstance || !address) return
    
    if (playlistSongs.length === 0) {
      alert('Add at least one song to your playlist before submitting!')
      return
    }
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/playlist-battle/${battleInstance.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userAddress: address,
          playlistName: `My ${battleInstance.playlist_prompt.name}`,
          playlistDescription: `Created in a playlist battle by ${user?.username}`
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        if (data.isResubmission) {
          alert('This playlist was already submitted to the gallery!')
          router.push('/playlist-battle/gallery')
        } else {
          alert('Playlist submitted to gallery!')
          router.push('/playlist-battle/gallery')
        }
      } else {
        alert('Failed to submit: ' + data.error)
      }
    } catch (error) {
      console.error('Error submitting playlist:', error)
      alert('Error submitting playlist')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const canSubmit = playlistSongs.length > 0

  if (!battleInstance) {
    return (
      <div className="flex h-full bg-black text-white items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Battle Not Found</h1>
          <p className="text-gray-400 mb-6">The playlist battle you&apos;re looking for doesn&apos;t exist.</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-black text-white">
        {/* Main Content - Fixed width and properly organized */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Main content area - properly contained */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden mr-80">
            {/* Fixed Header Section */}
            <div className="flex-shrink-0 bg-gradient-to-b from-gray-900 to-black border-b border-gray-700/50">
              <div className="max-w-6xl mx-auto px-8 pt-8 pb-4">
                <PlaylistHeader
                  playlistPrompt={battleInstance.playlist_prompt}
                  playlistCount={playlistSongs.length}
                  energyUnits={energyUnits}
                />
              </div>
            </div>

            {/* Scrollable Songs List Section */}
            <div className="flex-1 bg-gradient-to-b from-gray-900 to-black overflow-y-auto">
              <div className="max-w-6xl mx-auto px-8 py-6">
                <div className="bg-gray-800/30 rounded-2xl backdrop-blur-sm border border-gray-700/50">
                  {/* Songs List - Only this section scrolls */}
                  <div className="max-h-full overflow-y-auto">
                    <SongsList
                      songs={playlistSongs}
                      onPlaySong={playSong}
                      onLikeSong={handleLikeSong}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Fixed Sidebar */}
          <SidebarContainer
            battleInstance={battleInstance}
            revealedQueueSongs={revealedQueueSongs}
            queueSongs={queueSongs}
            playlistSongs={playlistSongs}
            isFlipping={isFlipping}
            isCardFlipped={isCardFlipped}
            lastRevealResult={lastRevealResult}
            canFlipMore={canFlipMore}
            currentSeedIndex={currentSeedIndex}
            energyUnits={energyUnits}
            canAddSong={canAddSong}
            canPassSong={canPassSong}
            hasPlaylistSongs={playlistSongs.length > 0}
            onFlip={flipCard}
            onFlipBack={flipCardBack}
            onAddToPlaylist={handleAddToPlaylist}
            onPassSong={handlePassSong}
            onRearrangePlaylist={handleOpenRearrangeModal}
            onPause={handlePause}
            onBack={() => router.push('/')}
            onSubmitToGallery={handleSubmitToGallery}
            isSubmitting={isSubmitting}
            canSubmit={playlistSongs.length > 0}
          />
        </div>

        <RearrangeModal
          isOpen={isRearrangeModalOpen}
          songs={playlistSongs}
          onClose={() => setIsRearrangeModalOpen(false)}
          onSave={handleSaveRearrange}
        />
      </div>
    </>
  )
}