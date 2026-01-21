import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const battleInstanceId = params.id

    // Get current battle instance
    const { data: battle, error: fetchError } = await supabase
      .from('playlist_battle_instances')
      .select('energy_units')
      .eq('id', battleInstanceId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    // Add 5 energy units
    const newEnergy = Math.min(100, battle.energy_units + 5)

    // Update energy
    const { data: updatedBattle, error: updateError } = await supabase
      .from('playlist_battle_instances')
      .update({ 
        energy_units: newEnergy,
        updated_at: new Date().toISOString()
      })
      .eq('id', battleInstanceId)
      .select(`
        *,
        playlist_prompt:playlist_battle_prompts(*)
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    if (process.env.NODE_ENV === 'production') {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return NextResponse.json({ 
      success: true, 
      updatedBattle,
      energy_units: newEnergy,
      message: 'Took a pause and gained 5 energy!'
    })
    
  } catch (error: any) {
    console.error('Error during pause:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to pause' },
      { status: 500 }
    )
  }
}