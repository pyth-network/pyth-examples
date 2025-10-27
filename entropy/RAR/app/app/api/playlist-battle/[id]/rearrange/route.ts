import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const battleInstanceId = params.id
    
    // Parse request body - songOrder is optional
    let songOrder: string[] | undefined
    try {
      const body = await request.json()
      songOrder = body.songOrder
    } catch (e) {
      console.log('No song order provided, will use random shuffle')
    }

    // Get current battle instance
    const { data: battle, error: fetchError } = await supabase
      .from('playlist_battle_instances')
      .select('playlist_songs, energy_units')
      .eq('id', battleInstanceId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    // Check if there are songs to rearrange
    if (!battle.playlist_songs || battle.playlist_songs.length === 0) {
      return NextResponse.json({ 
        error: 'No songs in playlist to rearrange' 
      }, { status: 400 })
    }

    // Determine the new song order
    let reorderedSongs: string[]
    
    if (songOrder && Array.isArray(songOrder) && songOrder.length > 0) {

      const originalSet = new Set(battle.playlist_songs)
      const newSet = new Set(songOrder)
      
      if (originalSet.size !== newSet.size ||
          !battle.playlist_songs.every((id: string) => newSet.has(id))) {
        return NextResponse.json({
          error: 'Invalid song order provided. Song IDs do not match.'
        }, { status: 400 })
      }
      
      reorderedSongs = songOrder
      console.log('📋 Manual rearrangement applied')
    } else {

      reorderedSongs = [...battle.playlist_songs]
      for (let i = reorderedSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [reorderedSongs[i], reorderedSongs[j]] = [reorderedSongs[j], reorderedSongs[i]]
      }
      console.log('🎲 Random shuffle applied')
    }

    // Add 2 energy units
    const newEnergy = Math.min(100, battle.energy_units + 2)

    // Update playlist order and energy
    const { data: updatedBattle, error: updateError } = await supabase
      .from('playlist_battle_instances')
      .update({ 
        playlist_songs: reorderedSongs,
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

    console.log('Playlist rearranged successfully')
    
    return NextResponse.json({ 
      success: true, 
      updatedBattle,
      energy_units: newEnergy,
      message: 'Playlist rearranged and gained 2 energy!'
    })
    
  } catch (error: any) {
    console.error('Error rearranging playlist:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to rearrange playlist' },
      { status: 500 }
    )
  }
}