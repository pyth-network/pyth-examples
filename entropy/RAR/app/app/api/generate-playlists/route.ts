import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Starting playlist generation...')

    // Get the most recent seed from the database
    const { data: latestSeed, error: seedError } = await supabase
      .from('daily_seeds')
      .select('seed_hash')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (seedError) {
      console.error('Error fetching seed:', seedError)
      return NextResponse.json({ 
        success: false, 
        error: 'Error fetching seed from database' 
      })
    }

    if (!latestSeed) {
      return NextResponse.json({ 
        success: false, 
        error: 'No seed found in database. Generate seed first.' 
      })
    }

    const seed = latestSeed.seed_hash
    console.log('Using seed from database:', seed)

    // Generate and store playlists
    const result = await generateAndStorePlaylists(seed)

    return NextResponse.json({ 
      success: true, 
      message: 'Playlists generated successfully',
      seed: seed,
      generatedPlaylists: result
    })

  } catch (error: any) {
    console.error('Error generating playlists:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to generate playlists' 
    }, { status: 500 })
  }
}

async function generateAndStorePlaylists(seed: string): Promise<any> {
  const allSongs = await getSongsFromSupabase()
  const today = new Date().toISOString().split('T')[0]

  console.log(`Found ${allSongs.length} songs in database`)

  if (allSongs.length === 0) {
    console.log('No songs available for playlist generation')
    return { success: false, error: 'No songs available' }
  }

  // Get playlist definitions
  const { data: playlistDefs, error: defError } = await supabase
    .from('playlist_definitions')
    .select('*')
    .eq('is_auto_generated', true)

  if (defError) {
    console.error('Error fetching playlist definitions:', defError)
    return { success: false, error: 'Failed to fetch playlist definitions' }
  }

  if (!playlistDefs || playlistDefs.length === 0) {
    console.log('No playlist definitions found')
    return { success: false, error: 'No playlist definitions found' }
  }

  console.log(`Generating ${playlistDefs.length} playlists from ${allSongs.length} songs`)

  const results = []
  
  const songDistribution = distributeSongsAcrossPlaylists(allSongs, playlistDefs.length, seed)
  console.log('Song distribution plan:', songDistribution)
  
  // Generate playlists for each definition
  for (let i = 0; i < playlistDefs.length; i++) {
    const definition = playlistDefs[i]
    console.log(`\n🔄 Generating playlist: ${definition.name}`)
    
    // Get this playlist's assigned songs from the distribution plan
    const playlistSongs = songDistribution[i] || []
    console.log(`   Assigned ${playlistSongs.length} songs for ${definition.name}:`, 
      playlistSongs.map(s => s.title))
    
    // Store in daily_playlists
    const { data, error } = await supabase
      .from('daily_playlists')
      .upsert({
        playlist_definition_id: definition.id,
        seed_hash: seed,
        day: today,
        song_ids: playlistSongs.map(song => song.id)
      }, {
        onConflict: 'playlist_definition_id,day'
      })
    
    if (error) {
      console.error(`Error storing playlist ${definition.name}:`, error)
      results.push({ name: definition.name, success: false, error: error.message })
    } else {
      console.log(`Successfully stored playlist: ${definition.name} with ${playlistSongs.length} songs`)
      results.push({ name: definition.name, success: true, songCount: playlistSongs.length })
    }
  }

  return { success: true, results }
}


function distributeSongsAcrossPlaylists(allSongs: any[], playlistCount: number, seed: string): any[][] {
  const songsPerPlaylist = 5
  const availableSongs = allSongs.length
  
  console.log(`Distribution: ${playlistCount} playlists × ${songsPerPlaylist} songs = ${playlistCount * songsPerPlaylist} slots from ${availableSongs} songs`)
  

  return distributeWithSmartRandomness(allSongs, playlistCount, songsPerPlaylist, seed)
}

function distributeWithSmartRandomness(allSongs: any[], playlistCount: number, songsPerPlaylist: number, seed: string): any[][] {
  const distribution: any[][] = Array(playlistCount).fill(null).map(() => [])
  const songUsageCount = new Map()
  
  // Initialize usage count
  allSongs.forEach(song => songUsageCount.set(song.id, 0))
  
  // Calculate how many times we can use each song
  const totalSlots = playlistCount * songsPerPlaylist
  const maxUsagePerSong = Math.ceil(totalSlots / allSongs.length) + 1 // Allow some flexibility
  
  console.log(`Max usage per song: ${maxUsagePerSong}`)
  
  // Create a pool of available song slots
  let availableSongPool: any[] = []
  allSongs.forEach(song => {
    // Add each song multiple times to the pool based on max usage
    for (let i = 0; i < maxUsagePerSong; i++) {
      availableSongPool.push(song)
    }
  })
  
  console.log(`Initial song pool size: ${availableSongPool.length}`)
  
  // Shuffle the entire pool once with the main seed
  availableSongPool = fisherYatesShuffle(availableSongPool, seed)
  
  // Assign songs to playlists
  for (let playlistIndex = 0; playlistIndex < playlistCount; playlistIndex++) {
    const playlistSeed = seed + `_playlist_${playlistIndex}`
    const playlist = distribution[playlistIndex]
    
    // Get unique songs for this playlist from the pool
    const usedSongIds = new Set()
    let attempts = 0
    const maxAttempts = availableSongPool.length * 2
    
    while (playlist.length < songsPerPlaylist && attempts < maxAttempts && availableSongPool.length > 0) {
      attempts++
      
      // Use playlist-specific randomness to pick from the pool
      const random = createSeededRandom(playlistSeed + `_attempt_${attempts}`)
      const randomIndex = Math.floor(random() * availableSongPool.length)
      const candidateSong = availableSongPool[randomIndex]
      
      // Check if this song is already in the playlist
      if (!usedSongIds.has(candidateSong.id)) {
        playlist.push(candidateSong)
        usedSongIds.add(candidateSong.id)
        
        // Remove this instance from the pool (but other instances remain)
        availableSongPool.splice(randomIndex, 1)
      }
    }
    
    // If we still don't have enough songs, fill with any available unique songs
    if (playlist.length < songsPerPlaylist) {
      const remainingSongs = [...allSongs].filter(song => !usedSongIds.has(song.id))
      const needed = songsPerPlaylist - playlist.length
      const additionalSongs = remainingSongs.slice(0, needed)
      playlist.push(...additionalSongs)
    }
    
    // Final shuffle of this playlist
    distribution[playlistIndex] = fisherYatesShuffle(playlist, playlistSeed + '_final')
    
    console.log(`Playlist ${playlistIndex}: ${playlist.map(s => s.title).join(', ')}`)
  }
  
  // Log final statistics
  console.log('Final song usage statistics:')
  const finalUsage = new Map()
  distribution.forEach(playlist => {
    playlist.forEach(song => {
      finalUsage.set(song.id, (finalUsage.get(song.id) || 0) + 1)
    })
  })
  
  allSongs.forEach(song => {
    const usage = finalUsage.get(song.id) || 0
    console.log(`   ${song.title}: used ${usage} times`)
  })
  
  // Verify we have unique songs in each playlist
  distribution.forEach((playlist, index) => {
    const uniqueSongs = new Set(playlist.map(s => s.id))
    if (uniqueSongs.size !== playlist.length) {
      console.warn(`Playlist ${index} has duplicate songs!`)
    }
  })
  
  return distribution
}

// Get songs directly from Supabase (since we're in server environment)
async function getSongsFromSupabase() {
  const { data: songs, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching songs:', error)
    return []
  }

  return songs || []
}

function fisherYatesShuffle(array: any[], seed: string): any[] {
  const shuffled = [...array]
  const random = createSeededRandom(seed)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
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