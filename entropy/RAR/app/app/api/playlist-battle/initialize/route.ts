import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { userService } from '@/services/userService'
import { songService } from '@/services/songService'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { 
      playlistPromptId, 
      userAddress, 
      randomNumber, 
      coinFlipResult,
      timestamp 
    } = await request.json()
    
    console.log('Initialize API called with:', { 
      playlistPromptId, 
      userAddress, 
      coinFlipResult,
      hasRandomNumber: !!randomNumber 
    })
    
    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 })
    }

    if (!playlistPromptId) {
      return NextResponse.json({ error: 'Playlist prompt ID is required' }, { status: 400 })
    }

    if (!randomNumber || coinFlipResult === undefined) {
      return NextResponse.json({ error: 'Random data is required' }, { status: 400 })
    }

    // Verify the user exists in our database
    const user = await userService.getUserByWalletAddress(userAddress.toLowerCase())
    
    if (!user) {
      console.error('User not found for address:', userAddress)
      return NextResponse.json({ 
        error: 'User not found. Please ensure you are signed in.' 
      }, { status: 401 })
    }

    console.log('User found:', user.id, user.username)
    
    // Calculate initial seed count based on coin flip
    const initialSeedCount = coinFlipResult ? 0 : 2
    console.log(`Coin flip result: ${coinFlipResult ? 'Heads' : 'Tails'} -> ${initialSeedCount} initial seeds`)
    
    // Get all songs for library generation
    const allSongs = await songService.getSongs()
    console.log(`Found ${allSongs.length} total songs`)
    
    if (allSongs.length === 0) {
      return NextResponse.json({ 
        error: 'No songs available. Please upload some songs first.' 
      }, { status: 400 })
    }
    
    const librarySongs = generateLibrary(allSongs, randomNumber, 10)
    console.log('Generated library:', librarySongs.map(s => s.title))
    
    // Split songs between playlist and queue
    const playlistSongs = librarySongs.slice(0, initialSeedCount)
    const queueSongs = librarySongs.slice(initialSeedCount)
    
    console.log(`Distribution - Playlist: ${playlistSongs.length}, Queue: ${queueSongs.length}`)
    
    // Create battle instance in database
    const { data: battleInstance, error: dbError } = await supabase
  .from('playlist_battle_instances')
  .insert({
    user_id: user.id,
    playlist_prompt_id: playlistPromptId,
    random_seed: randomNumber, 
    coin_flip_result: coinFlipResult,
    initial_seed_count: initialSeedCount,
    library_songs: librarySongs.map(song => song.id),
    playlist_songs: playlistSongs.map(song => song.id),
    queue_songs: queueSongs.map(song => song.id),
    energy_units: 100
  })
  .select(`
    *,
    playlist_prompt:playlist_battle_prompts(*)
  `)
  .single()

    
    if (dbError) {
      console.error('Database error:', dbError)
      throw dbError
    }

    console.log('Battle instance created:', battleInstance.id)
    
    return NextResponse.json({ 
      success: true, 
      battleInstance 
    })
    
  } catch (error: any) {
    console.error('Error initializing playlist battle:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to initialize battle',
        details: error.stack 
      },
      { status: 500 }
    )
  }
}

// Helper functions
function generateLibrary(allSongs: any[], seed: string, count: number): any[] {
  if (allSongs.length <= count) return allSongs
  const shuffled = seededShuffle([...allSongs], seed)
  return shuffled.slice(0, count)
}

function seededShuffle(array: any[], seed: string): any[] {
  const shuffled = [...array]
  const random = createSeededRandom(seed)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function createSeededRandom(seed: string): () => number {
  let state = bytes32ToNumber(seed)
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function bytes32ToNumber(bytes32: string): number {
  return parseInt(bytes32.slice(2, 10), 16)
}