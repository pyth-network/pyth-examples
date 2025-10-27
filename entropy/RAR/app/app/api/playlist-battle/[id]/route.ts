import { NextRequest, NextResponse } from 'next/server'
import { playlistBattleService } from '@/services/playlistBattleService'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const battleInstanceId = params.id
    
    const battleInstance = await playlistBattleService.getBattleInstance(battleInstanceId)
    if (!battleInstance) {
      return NextResponse.json({ error: 'Battle instance not found' }, { status: 404 })
    }

    const battleSongs = await playlistBattleService.getBattleSongs(battleInstanceId)
    
    return NextResponse.json({ 
      success: true, 
      battleInstance,
      ...battleSongs
    })
    
  } catch (error: any) {
    console.error('Error fetching battle instance:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch battle instance' },
      { status: 500 }
    )
  }
}