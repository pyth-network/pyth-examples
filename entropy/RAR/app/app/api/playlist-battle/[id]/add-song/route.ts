import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { songService } from '@/services/songService'

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
      .select('playlist_songs, queue_songs, energy_units')
      .eq('id', battleInstanceId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    // Check if song exists in queue
    if (!battle.queue_songs.includes(songId)) {
      return NextResponse.json({ error: 'Song not found in queue' }, { status: 400 })
    }

    // Check if enough energy (5 units for adding)
    if (battle.energy_units < 5) {
      return NextResponse.json({ 
        error: 'Not enough energy to add song' 
      }, { status: 400 })
    }

    // Remove song from queue and add to playlist, and update energy
    const updatedQueue = battle.queue_songs.filter((id: string) => id !== songId)
    const updatedPlaylist = [...battle.playlist_songs, songId]
    const newEnergy = battle.energy_units - 5

    // Update the battle instance
    const { data: updatedBattle, error: updateError } = await supabase
      .from('playlist_battle_instances')
      .update({ 
        playlist_songs: updatedPlaylist,
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

    // Get updated song data
    const allSongs = await songService.getSongs()
    const songMap = new Map(allSongs.map(song => [song.id, song]))
    
    const playlistSongs = updatedPlaylist
      .map((songId: string) => songMap.get(songId))
      .filter(Boolean)

    const queueSongs = updatedQueue
      .map((songId: string) => songMap.get(songId))
      .filter(Boolean)

    return NextResponse.json({ 
      success: true, 
      updatedBattle,
      playlistSongs,
      queueSongs,
      energy_units: newEnergy
    })
    
  } catch (error: any) {
    console.error('Error adding song to playlist:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add song to playlist' },
      { status: 500 }
    )
  }
}