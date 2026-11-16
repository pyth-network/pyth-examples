import { useState, useEffect } from 'react'
import { BattleInstance } from '@/app/playlist-battle/[id]/types/playlist-battle'

export const useBattleEnergy = (battleInstance: BattleInstance | null) => {
  const [energyUnits, setEnergyUnits] = useState(100)
  const [isLoading, setIsLoading] = useState(false)

  // Initialize energy from battle instance
  useEffect(() => {
    if (battleInstance?.energy_units !== undefined) {
      setEnergyUnits(battleInstance.energy_units)
    }
  }, [battleInstance])

  // This function is now only used for manual energy updates if needed
  const consumeEnergy = async (amount: number = 5): Promise<boolean> => {
    if (!battleInstance?.id) return false
    
    if (energyUnits < amount) {
      console.log('❌ Not enough energy!')
      return false
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/playlist-battle/${battleInstance.id}/energy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'consume',
          amount: amount
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setEnergyUnits(data.energy_units)
        console.log(`⚡ Consumed ${amount} energy units. Remaining: ${data.energy_units}`)
        return true
      } else {
        console.error('Failed to update energy:', data.error)
        return false
      }
    } catch (error) {
      console.error('Error consuming energy:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const canAfford = (amount: number) => energyUnits >= amount

  return {
    energyUnits,
    setEnergyUnits, 
    consumeEnergy,
    canAddSong: canAfford(5),
    canPassSong: canAfford(3),
    isLoading
  }
}