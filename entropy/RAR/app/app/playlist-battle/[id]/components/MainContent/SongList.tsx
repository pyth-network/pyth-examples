import { Play, Heart, MoreHorizontal, ListMusic } from 'lucide-react'
import { Song } from '@/app/playlist-battle/[id]/types/playlist-battle'

interface SongsListProps {
  songs: Song[]
  onPlaySong: (song: Song) => void
  onLikeSong: (songId: string) => void
}

export const SongsList = ({
  songs,
  onPlaySong,
  onLikeSong
}: SongsListProps) => {
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (songs.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <ListMusic className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No songs in playlist yet</h3>
        <p>Add songs from the queue to build your battle playlist</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header Row - Fixed */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-gray-400 text-sm font-medium border-b border-gray-800 mb-2 sticky top-0 bg-gray-800/30 backdrop-blur-sm z-10">
        <div className="col-span-1">#</div>
        <div className="col-span-6">TITLE</div>
        <div className="col-span-3">ALBUM</div>
        {/* <div className="col-span-2 text-right">DURATION</div> */}
      </div>
      
      {/* Songs List - Scrollable */}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {songs.map((song, index) => (
          <div 
            key={song.id} 
            className="grid grid-cols-12 gap-4 px-4 py-3 rounded-md hover:bg-gray-800 transition-all cursor-pointer group"
            onClick={() => onPlaySong(song)}
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
                <p className="text-gray-400 text-sm truncate">{song.artist}</p>
              </div>
            </div>
            <div className="col-span-3 flex items-center">
              <p className="text-gray-400 text-sm truncate">{song.album || 'Single'}</p>
            </div>
            <div className="col-span-2 flex items-center justify-end space-x-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  onLikeSong(song.id)
                }}
                className="text-gray-400 hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Like song"
              >
                <Heart className="w-4 h-4" />
                {song.likes > 0 && (
                  <span className="text-xs ml-1">{song.likes}</span>
                )}
              </button>
              <button 
                className="text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                title="More options"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {/* <p className="text-gray-400 text-sm">{formatDuration(song.duration)}</p> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}