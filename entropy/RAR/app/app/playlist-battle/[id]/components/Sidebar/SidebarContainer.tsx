import { ArrowLeft } from 'lucide-react'
import { BattleInstance, Song, RevealResult } from '@/app/playlist-battle/[id]/types/playlist-battle'
import { RevealCard } from './RevealCard'
import { Trophy } from 'lucide-react'

interface SidebarContainerProps {
  battleInstance: BattleInstance
  revealedQueueSongs: Song[]
  queueSongs: Song[]
  playlistSongs: Song[]
  isFlipping: boolean
  isCardFlipped: boolean
  lastRevealResult: RevealResult | null
  canFlipMore: boolean
  currentSeedIndex: number
  onFlip: () => void
  onFlipBack: () => void
  onAddToPlaylist: (songId: string) => void
  onBack: () => void
  energyUnits: number
  canAddSong: boolean
  canPassSong: boolean
  onPassSong: (songId: string) => void 
  hasPlaylistSongs: boolean
  onRearrangePlaylist: () => void
  onPause: () => void 
  onSubmitToGallery: () => void
  isSubmitting: boolean
  canSubmit: boolean
}

export const SidebarContainer = ({
  battleInstance,
  revealedQueueSongs,
  queueSongs,
  playlistSongs,
  isFlipping,
  isCardFlipped,
  lastRevealResult,
  canFlipMore,
  currentSeedIndex,
  onFlip,
  onFlipBack,
  onAddToPlaylist,
  onBack,
  energyUnits,
  canAddSong,
  canPassSong,
  onPassSong,
  hasPlaylistSongs,
  onRearrangePlaylist,
  onPause,
  onSubmitToGallery,
  isSubmitting,
  canSubmit
}: SidebarContainerProps) => {

  return (
     <div className="w-80 bg-gray-900/95 border-l border-gray-700/50 flex flex-col h-[calc(100vh-80px)] fixed right-0 top-0 backdrop-blur-sm">
      {/* Minimal Header - reduced padding */}
      <div className="flex-shrink-0 p-3 border-b border-gray-700/50">
        <div className="flex items-center space-x-2">
          <button 
            onClick={onBack} 
            className="p-1 hover:bg-gray-800 rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-md font-bold text-white truncate">Song Queue</h2>
            <p className="text-gray-400 text-xs truncate">Flip the card</p>
          </div>
        </div>
      </div>

      {/* Reveal Card Section - Takes majority of space */}
      <div className="flex-[1.2] p-3 flex flex-col min-h-0">
        <RevealCard
          isFlipping={isFlipping}
          isCardFlipped={isCardFlipped}
          lastRevealResult={lastRevealResult}
          canFlipMore={canFlipMore && (canAddSong || canPassSong)}
          attemptsLeft={(battleInstance.random_seed?.slice(2).length || 0) - currentSeedIndex}
          revealedCount={revealedQueueSongs.length}
          totalQueueSongs={queueSongs.length}
          hasPlaylistSongs={hasPlaylistSongs}
          onFlip={onFlip}
          onFlipBack={onFlipBack}
          onAddToPlaylist={onAddToPlaylist}
          onPassSong={onPassSong}
          onRearrangePlaylist={onRearrangePlaylist}
          onPause={onPause}
        />
      </div>

      {/* Submit Section - Fixed at bottom */}
         <div className="flex-shrink-0 p-4 border-t border-gray-700/50">
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl border border-purple-500/30 p-3">
          <button
            onClick={onSubmitToGallery}
            disabled={!canSubmit || isSubmitting}
            className="w-full flex items-center justify-center space-x-2 bg-white text-black py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting ? (
              <div className="animate-spin">⟳</div>
            ) : (
              <>
                <span>Submit to Gallery</span>
              </>
            )}
          </button>
          
           <div className="mt-3 text-center"> {/* Reduced margin */}
            <p className="text-white/80 text-xs">
              {!canSubmit ? (
                "Add songs to submit"
              ) : (
                "You can submit anytime you are done!"
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}