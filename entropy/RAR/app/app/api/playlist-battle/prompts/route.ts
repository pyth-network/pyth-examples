import { NextResponse } from 'next/server'
import { playlistBattleService } from '@/services/playlistBattleService'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const prompts = await playlistBattleService.getPlaylistBattlePrompts()
    
    return NextResponse.json({ 
      success: true, 
      prompts 
    })
    
  } catch (error: any) {
    console.error('Error fetching playlist battle prompts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}