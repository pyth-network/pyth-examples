import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('userAddress')
    
    let query = supabase
      .from('gallery_playlists')
      .select(`
        *,
        user:users(username, wallet_address, reputation_level),
        playlist_prompt:playlist_battle_prompts(*)
      `)
      .order('submitted_at', { ascending: false })

    // Only filter by user if specifically requested
    if (userAddress) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', userAddress.toLowerCase())
        .single()

      if (user) {
        query = query.eq('user_id', user.id)
      }
    }

    const { data: galleryPlaylists, error } = await query

    if (error) {
      throw error
    }

    // Ensure all playlists have playlist_songs as array
    const safePlaylists = (galleryPlaylists || []).map(playlist => ({
      ...playlist,
      playlist_songs: Array.isArray(playlist.playlist_songs) ? playlist.playlist_songs : []
    }))

    // Group by playlist prompt
    const groupedPlaylists = safePlaylists.reduce((acc: any, playlist) => {
      const promptId = playlist.playlist_prompt_id
      if (!acc[promptId]) {
        acc[promptId] = {
          prompt: playlist.playlist_prompt,
          playlists: []
        }
      }
      acc[promptId].playlists.push(playlist)
      return acc
    }, {})

    return NextResponse.json({ 
      success: true, 
      galleryPlaylists: groupedPlaylists || {},
      totalCount: safePlaylists.length
    })

  } catch (error: any) {
    console.error('Error fetching gallery playlists:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch gallery playlists' },
      { status: 500 }
    )
  }
}
