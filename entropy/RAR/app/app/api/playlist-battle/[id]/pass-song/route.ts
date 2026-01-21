import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { songService } from '@/services/songService' // Add this import

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const battleInstanceId = params.id
    const { songId } = await request.json()
    
    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 })
    }

    // Get current battle instance
    const { data: battle, error: fetchError } = await supabase
      .from('playlist_battle_instances')
      .select('queue_songs, energy_units')
      .eq('id', battleInstanceId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    // Check if song exists in queue
    if (!battle.queue_songs.includes(songId)) {
      return NextResponse.json({ error: 'Song not found in queue' }, { status: 400 })
    }

    // Check if enough energy (3 units for passing)
    if (battle.energy_units < 3) {
      return NextResponse.json({ 
        error: 'Not enough energy to pass song' 
      }, { status: 400 })
    }

    // Remove song from queue and update energy
    const updatedQueue = battle.queue_songs.filter((id: string) => id !== songId)
    const newEnergy = battle.energy_units - 3

    const { data: updatedBattle, error: updateError } = await supabase
      .from('playlist_battle_instances')
      .update({ 
        queue_songs: updatedQueue,
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

    // Get updated song data using songService
    const allSongs = await songService.getSongs()
    const songMap = new Map(allSongs.map(song => [song.id, song]))
    
    const queueSongs = updatedQueue
      .map((songId: string) => songMap.get(songId))
      .filter(Boolean)

    return NextResponse.json({ 
      success: true, 
      updatedBattle,
      queueSongs,
      energy_units: newEnergy
    })
    
  } catch (error: any) {
    console.error('Error passing song:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to pass song' },
      { status: 500 }
    )
  }
}