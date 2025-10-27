import { ListMusic, Music, Battery, BatteryCharging, BatteryLow } from 'lucide-react'
import { PlaylistPrompt } from '@/app/playlist-battle/[id]/types/playlist-battle'

interface PlaylistHeaderProps {
  playlistPrompt: PlaylistPrompt
  playlistCount: number
  energyUnits: number
}

export const PlaylistHeader = ({
  playlistPrompt,
  playlistCount,
  energyUnits
}: PlaylistHeaderProps) => {
  const getEnergyColor = () => {
    const percentage = (energyUnits / 100) * 100
    if (percentage > 60) return 'bg-green-500'
    if (percentage > 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getEnergyIcon = () => {
    const percentage = (energyUnits / 100) * 100
    if (percentage > 60) return <BatteryCharging className="w-4 h-4 text-green-500" />
    if (percentage > 30) return <Battery className="w-4 h-4 text-yellow-500" />
    return <BatteryLow className="w-4 h-4 text-red-500" />
  }

  const getEnergyTextColor = () => {
    const percentage = (energyUnits / 100) * 100
    if (percentage > 60) return 'text-green-500'
    if (percentage > 30) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Content - Takes up most of the space */}
      <div className="flex-1 min-w-0">
        {/* Badge */}
        <div className="inline-flex items-center px-3 py-1 bg-black/40 rounded-full mb-4 border border-white/10">
          <span className="text-sm font-semibold uppercase tracking-wider text-white/90">
            Playlist Battle
          </span>
        </div>
        
        {/* Title and Description */}
        <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
          {playlistPrompt.name}
        </h1>
        <p className="text-lg text-white/90 mb-4 leading-relaxed max-w-3xl">
          {playlistPrompt.description}
        </p>
        
        {/* Playlist Count */}
        <div className="flex items-center space-x-2 text-white/80 text-sm">
          <Music className="w-4 h-4" />
          <span>{playlistCount} songs in playlist</span>
        </div>
      </div>

      {/* Energy Bar - Far Right */}
      <div className="w-48 flex-shrink-0">
        <div className="bg-black/30 rounded-lg border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getEnergyIcon()}
              <span className="text-sm font-semibold text-gray-300">Energy</span>
            </div>
            <span className={`text-sm font-semibold ${getEnergyTextColor()}`}>
              {energyUnits}/100
            </span>
          </div>
          
          {/* Energy Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ease-out ${getEnergyColor()}`}
              style={{ 
                width: `${energyUnits}%`,
                boxShadow: energyUnits > 0 ? `0 0 6px ${getEnergyColor().replace('bg-', '')}` : 'none'
              }}
            ></div>
          </div>
          
          
        </div>
      </div>

      
    </div>
  )
}