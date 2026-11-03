import { Battery, BatteryCharging, BatteryLow } from 'lucide-react'

interface EnergyBarProps {
  energyUnits: number
  maxEnergy?: number
}

export const EnergyBar = ({ energyUnits, maxEnergy = 100 }: EnergyBarProps) => {
  const energyPercentage = (energyUnits / maxEnergy) * 100
  
  const getEnergyColor = () => {
    if (energyPercentage > 60) return 'bg-green-500'
    if (energyPercentage > 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getEnergyIcon = () => {
    if (energyPercentage > 60) return <BatteryCharging className="w-3 h-3 text-green-500" />
    if (energyPercentage > 30) return <Battery className="w-3 h-3 text-yellow-500" />
    return <BatteryLow className="w-3 h-3 text-red-500" />
  }

  return (
    <div className="p-2 bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-1">
          {getEnergyIcon()}
          <span className="text-xs font-semibold text-gray-300">Energy</span>
        </div>
        <span className="text-xs text-gray-400">
          {energyUnits}/{maxEnergy}
        </span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getEnergyColor()}`}
          style={{ width: `${energyPercentage}%` }}
        ></div>
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        <div className="border-b border-gray-600 pb-1 mb-1">
    <span className="font-semibold">Costs:</span>
    {energyUnits >= 5 ? (
      <span>⚡ Add: 5</span>
    ) : (
      <span className="text-red-400">❌ Add: 5</span>
    )}
    {energyUnits >= 3 ? (
      <span>⏩ Pass: 3</span>
    ) : (
      <span className="text-red-400">❌ Pass: 3</span>
    )}
  </div>
     

      <div>
    <span className="font-semibold">Restore:</span>
    <span>🔄 Rearrange: +2</span>
    <span>⏸️ Pause: +5</span>
  </div>
      </div>
       </div>
  )
}