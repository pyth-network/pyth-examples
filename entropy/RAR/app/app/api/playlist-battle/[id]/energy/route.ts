import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const battleInstanceId = params.id
    const { action, amount } = await request.json()
    
    if (!action || !amount) {
      return NextResponse.json({ error: 'Action and amount are required' }, { status: 400 })
    }

    // Get current battle instance
    const { data: battle, error: fetchError } = await supabase
      .from('playlist_battle_instances')
      .select('energy_units')
      .eq('id', battleInstanceId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    let newEnergy = battle.energy_units

    if (action === 'consume') {
      if (battle.energy_units < amount) {
        return NextResponse.json({ 
          error: 'Not enough energy units' 
        }, { status: 400 })
      }
      newEnergy = battle.energy_units - amount
    } else if (action === 'restore') {
      newEnergy = Math.min(100, battle.energy_units + amount)
    }

    // Update energy in database
    const { data: updatedBattle, error: updateError } = await supabase
      .from('playlist_battle_instances')
      .update({ 
        energy_units: newEnergy,
        updated_at: new Date().toISOString()
      })
      .eq('id', battleInstanceId)
      .select('energy_units')
      .single()

    if (updateError) {
      throw updateError
    }

    if (process.env.NODE_ENV === 'production') {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return NextResponse.json({ 
      success: true,
      energy_units: updatedBattle.energy_units
    })
    
  } catch (error: any) {
    console.error('Error updating energy:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update energy' },
      { status: 500 }
    )
  }
}