import { Play, Plus, Eye, EyeOff, SkipForward, RefreshCw, Pause } from 'lucide-react'
import { RevealResult } from '@/app/playlist-battle/[id]/types/playlist-battle'

interface RevealCardProps {
  isFlipping: boolean
  isCardFlipped: boolean
  lastRevealResult: RevealResult | null
  canFlipMore: boolean
  attemptsLeft: number
  revealedCount: number
  totalQueueSongs: number
  hasPlaylistSongs: boolean
  onFlip: () => void
  onFlipBack: () => void
  onAddToPlaylist: (songId: string) => void
  onPassSong: (songId: string) => void
  onRearrangePlaylist: () => void
  onPause: () => void
}

export const RevealCard = ({
  isFlipping,
  isCardFlipped,
  lastRevealResult,
  canFlipMore,
  attemptsLeft,
  revealedCount,
  totalQueueSongs,
  hasPlaylistSongs,
  onFlip,
  onFlipBack,
  onAddToPlaylist,
  onPassSong,
  onRearrangePlaylist,
  onPause
}: RevealCardProps) => {

  const handleCardClick = () => {
    if (isFlipping) return;
    
    if (isCardFlipped) {
      onFlipBack();
    } else {
      if (canFlipMore) {
        onFlip();
      }
    }
  }

      return (
    <div className="h-full flex flex-col">
      {/* Main Card Container */}
      <div className="flex-1 min-h-0">
        <div 
          className={`relative w-full h-full ${isFlipping ? 'pointer-events-none' : ''}`} 
          style={{ perspective: '1000px' }}
        >
          {/* Front of Card - Flip to Reveal */}
          <div 
            className={`absolute w-full h-full rounded-2xl shadow-2xl cursor-pointer transition-transform duration-500 bg-gradient-to-br from-blue-600 to-purple-700 ${
              !isFlipping ? 'hover:scale-105' : ''
            } ${isCardFlipped ? 'rotate-y-180' : 'rotate-y-0'}`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d'
            }}
            onClick={handleCardClick}
          >
            <div className="flex flex-col items-center justify-center h-full p-6 text-white">
              {/* Eye Icon */}
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                <Eye className="w-8 h-8" />
              </div>
              
              {/* Main Text */}
              <h3 className="text-xl font-bold text-center mb-2">Flip to Reveal</h3>
              <p className="text-center text-white/80 mb-6">
                {canFlipMore 
                  ? "Click to reveal a song from your queue" 
                  : "No more songs to reveal"}
              </p>

              

              {/* Flip Instruction */}
              {canFlipMore && (
                <p className="text-center text-white/60 text-xs mt-6">
                  Click card to flip and reveal
                </p>
              )}
            </div>
          </div>

          {/* Back of Card - Result Display */}
          <div 
            className={`absolute w-full h-full rounded-2xl shadow-2xl cursor-pointer transition-transform duration-500 ${
              lastRevealResult?.revealed 
                ? 'bg-gradient-to-br from-green-600 to-emerald-700' 
                : 'bg-gradient-to-br from-gray-600 to-gray-700'
            } ${!isFlipping ? 'hover:scale-105' : ''} ${isCardFlipped ? 'rotate-y-0' : 'rotate-y-180'}`}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d'
            }}
            onClick={handleCardClick}
          >
            <div className="flex flex-col items-center justify-center h-full p-6 text-white">
              {lastRevealResult?.revealed && lastRevealResult.song ? (
                <>
                  {/* Song Found State */}
                  <div className="text-center mb-4 w-full px-4">
                    <h3 className="text-lg font-bold mb-2">Song Found!</h3>
                    <p className="font-semibold text-base mb-1 truncate">
                      {lastRevealResult.song.title}
                    </p>
                    <p className="text-white/80 text-sm truncate">
                      {lastRevealResult.song.artist}
                    </p>
                  </div>

                  {/* Play Button */}
                  <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center mb-6 animate-pulse [animation-duration:2s] hover:scale-110 transition-transform duration-200">
                    <Play className="w-8 h-8 text-white" />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-3 w-full px-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddToPlaylist(lastRevealResult.song!.id)
                      }}
                      className="w-full bg-green-500 text-white px-4 py-3 rounded-full text-sm font-semibold hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add to Playlist (-5⚡)</span>
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        onPassSong(lastRevealResult.song!.id)
                      }}
                      className="w-full bg-orange-500 text-white px-4 py-3 rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <SkipForward className="w-4 h-4" />
                      <span>Pass Song (-3⚡)</span>
                    </button>
                  </div>
                  
                  {/* Flip Back Instruction */}
                  <p className="text-center text-white/60 text-xs mt-6">Click card to flip back</p>
                </>
              ) : (
                <>
                  {/* No Song Found State */}
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                    <EyeOff className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-center mb-3">No Song</h3>
                  <p className="text-center text-white/80 text-base mb-6">Better luck next time!</p>
                  
                  {/* Restorative Action Buttons */}
                  <div className="flex flex-col space-y-3 w-full px-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        onRearrangePlaylist()
                      }}
                      disabled={!hasPlaylistSongs}
                      className="w-full bg-blue-500 text-white px-4 py-3 rounded-full text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Rearrange Playlist (+2⚡)</span>
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        onPause()
                      }}
                      className="w-full bg-purple-500 text-white px-4 py-3 rounded-full text-sm font-semibold hover:bg-purple-600 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Take a Pause (+5⚡)</span>
                    </button>
                  </div>
                  
                  {!hasPlaylistSongs && (
                    <p className="text-center text-white/60 text-xs mt-4 px-4">
                      Add songs to your playlist first to rearrange
                    </p>
                  )}
                  
                  {/* Flip Back Instruction */}
                  <p className="text-center text-white/60 text-xs mt-6">Click card to flip back</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}