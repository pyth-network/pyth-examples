import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { userService } from '@/services/userService'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const battleInstanceId = params.id
    const { userAddress, playlistName, playlistDescription } = await request.json()
    
    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 })
    }

    // Get user from database
    const user = await userService.getUserByWalletAddress(userAddress.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get battle instance
    const { data: battleInstance, error: battleError } = await supabase
      .from('playlist_battle_instances')
      .select(`
        *,
        playlist_prompt:playlist_battle_prompts(*)
      `)
      .eq('id', battleInstanceId)
      .single()

    if (battleError || !battleInstance) {
      return NextResponse.json({ error: 'Battle instance not found' }, { status: 404 })
    }

    // Check if user owns this battle instance
    if (battleInstance.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already submitted - return existing submission if found
    const { data: existingSubmission } = await supabase
      .from('gallery_playlists')
      .select('*')
      .eq('battle_instance_id', battleInstanceId)
      .single()

    if (existingSubmission) {
      return NextResponse.json({ 
        success: true, 
        galleryPlaylist: existingSubmission,
        message: 'Playlist already submitted to gallery',
        isResubmission: true
      })
    }

    // Check if playlist has songs
    if (!battleInstance.playlist_songs || battleInstance.playlist_songs.length === 0) {
      return NextResponse.json({ 
        error: 'Cannot submit empty playlist' 
      }, { status: 400 })
    }

    // Create gallery playlist entry
    const { data: galleryPlaylist, error: galleryError } = await supabase
      .from('gallery_playlists')
      .insert({
        user_id: user.id,
        battle_instance_id: battleInstanceId,
        playlist_prompt_id: battleInstance.playlist_prompt_id,
        playlist_name: playlistName || `${battleInstance.playlist_prompt.name} - ${user.username}`,
        playlist_description: playlistDescription || `Created by ${user.username} in a playlist battle`,
        playlist_songs: battleInstance.playlist_songs,
        energy_remaining: battleInstance.energy_units,
        submitted_at: new Date().toISOString()
      })
      .select(`
        *,
        user:users(username),
        playlist_prompt:playlist_battle_prompts(*)
      `)
      .single()

    if (galleryError) {
      console.error('Error creating gallery playlist:', galleryError)
      return NextResponse.json({ error: 'Failed to submit playlist' }, { status: 500 })
    }

    // Mark battle instance as completed
    await supabase
      .from('playlist_battle_instances')
      .update({ 
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', battleInstanceId)

    return NextResponse.json({ 
      success: true, 
      galleryPlaylist,
      message: 'Playlist submitted to gallery!'
    })

  } catch (error: any) {
    console.error('Error submitting playlist:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit playlist' },
      { status: 500 }
    )
  }
}