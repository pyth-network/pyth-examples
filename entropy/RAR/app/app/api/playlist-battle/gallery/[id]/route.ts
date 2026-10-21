import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlistId = params.id

    const { data: playlist, error } = await supabase
      .from('gallery_playlists')
      .select(`
        *,
        user:users(username, wallet_address, reputation_level),
        playlist_prompt:playlist_battle_prompts(*)
      `)
      .eq('id', playlistId)
      .single()

    if (error || !playlist) {
      console.error('Playlist fetch error:', error)
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Ensure playlist_songs exists and is an array
    if (!playlist.playlist_songs || !Array.isArray(playlist.playlist_songs)) {
      console.warn('Playlist songs is missing or not an array, setting to empty array')
      playlist.playlist_songs = []
    }

    return NextResponse.json({ 
      success: true, 
      playlist 
    })

  } catch (error: any) {
    console.error('Error fetching gallery playlist:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch playlist' },
      { status: 500 }
    )
  }
}