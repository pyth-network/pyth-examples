import { supabase } from '@/lib/supabase'
import { coinFlipService } from './coinFlipService'
import { songService } from './songService'

export const playlistBattleService = {

  async initializeBattle(
    userId: string, 
    playlistPromptId: string,
    userAddress: string
  ): Promise<any> {
    try {
      console.log('🎮 Initializing playlist battle for user:', userId)

      // Step 1: Get random number from CoinFlip
      const { sequenceNumber, txHash } = await coinFlipService.requestRandom(userAddress)
      console.log('Random number requested, sequence:', sequenceNumber)
      
      // Step 2: Wait for result
      const randomResult = await coinFlipService.waitForUserResult(userAddress, 60000)
      console.log('Random result received:', randomResult)

      const initialSeedCount = randomResult.isHeads ? 0 : 2
      console.log(`Coin flip result: ${randomResult.isHeads ? 'Heads' : 'Tails'} -> ${initialSeedCount} initial seeds`)
      
      // Step 3: Generate library of 10 songs (similar to daily playlists)
      const allSongs = await songService.getSongs()
      console.log(`Found ${allSongs.length} total songs`)
      
      const librarySongs = this.generateLibrary(allSongs, randomResult.randomNumber, 10)
      console.log('Generated library:', librarySongs.map(s => s.title))
      
      // Step 4: Split songs between playlist and queue
      const { playlistSongs, queueSongs } = this.distributeSongs(librarySongs, initialSeedCount)
      console.log(`Distribution - Playlist: ${playlistSongs.length}, Queue: ${queueSongs.length}`)
      
      // Step 5: Create battle instance in database (similar to daily_playlists)
      const { data: battleInstance, error } = await supabase
        .from('playlist_battle_instances')
        .insert({
          user_id: userId,
          playlist_prompt_id: playlistPromptId,
          random_seed: randomResult.randomNumber,
          coin_flip_result: randomResult.isHeads,
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
      
      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Battle instance created:', battleInstance.id)
      return battleInstance
      
    } catch (error) {
      console.error('Error initializing playlist battle:', error)
      throw error
    }
  },

  // Get user's active battle instances (similar to getTodaysPlaylists)
  async getUserBattles(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('playlist_battle_instances')
      .select(`
        *,
        playlist_prompt:playlist_battle_prompts(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get specific battle instance with full details (similar to getPlaylistData)
  async getBattleInstance(battleInstanceId: string): Promise<any> {
    const { data, error } = await supabase
      .from('playlist_battle_instances')
      .select(`
        *,
        playlist_prompt:playlist_battle_prompts(*)
      `)
      .eq('id', battleInstanceId)
      .single()
    
    if (error) throw error
    return data
  },

  // Get battle songs with full details (similar to your daily playlists pattern)
  async getBattleSongs(battleInstanceId: string): Promise<{
    playlistSongs: any[]
    queueSongs: any[]
    librarySongs: any[]
  }> {
    const battleInstance = await this.getBattleInstance(battleInstanceId)
    
    // Get all songs to map IDs to full song objects (similar to songService.getSongs())
    const allSongs = await songService.getSongs()
    const songMap = new Map(allSongs.map(song => [song.id, song]))
    
    const playlistSongs = battleInstance.playlist_songs
      .map((songId: string) => songMap.get(songId))
      .filter(Boolean)
    
    const queueSongs = battleInstance.queue_songs
      .map((songId: string) => songMap.get(songId))
      .filter(Boolean)
    
    const librarySongs = battleInstance.library_songs
      .map((songId: string) => songMap.get(songId))
      .filter(Boolean)
    
    return {
      playlistSongs,
      queueSongs,
      librarySongs
    }
  },

  // Add song from queue to playlist
 async addSongToPlaylist(battleInstanceId: string, songId: string): Promise<any> {
  const { data: battle, error: fetchError } = await supabase
    .from('playlist_battle_instances')
    .select('playlist_songs, queue_songs, energy_units')
    .eq('id', battleInstanceId)
    .single()
    
  if (fetchError) throw fetchError
  
  // Check if song exists in queue
  if (!battle.queue_songs.includes(songId)) {
    throw new Error('Song not found in queue')
  }
  
  // Check energy
  if (battle.energy_units < 5) {
    throw new Error('Not enough energy to add song')
  }
  
  // Remove from queue and add to playlist, and update energy
  const updatedQueue = battle.queue_songs.filter((id: string) => id !== songId)
  const updatedPlaylist = [...battle.playlist_songs, songId]
  const newEnergy = battle.energy_units - 5
  
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
  
  if (updateError) throw updateError
  return updatedBattle
},

  // Get available playlist battle prompts (similar to playlist_definitions)
  async getPlaylistBattlePrompts(): Promise<any[]> {
    const { data, error } = await supabase
      .from('playlist_battle_prompts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching playlist battle prompts:', error)
      return this.getFallbackPrompts()
    }
    
    return data || this.getFallbackPrompts()
  },

  // Fallback prompts (in case table is empty)
  getFallbackPrompts() {
    return [
      {
        id: 'workout-energy-mix',
        name: 'Workout Energy Mix',
        description: 'High-energy tracks to fuel your session',
        color_gradient: 'from-purple-600 to-blue-600'
      },
      {
        id: 'chill-vibes-only',
        name: 'Chill Vibes Only',
        description: 'Relaxing beats for your downtime',
        color_gradient: 'from-green-600 to-emerald-600'
      },
      {
        id: 'party-starters',
        name: 'Party Starters',
        description: 'Get the celebration going',
        color_gradient: 'from-orange-600 to-red-600'
      },
      {
        id: 'focus-flow',
        name: 'Focus Flow',
        description: 'Deep concentration soundtrack',
        color_gradient: 'from-blue-600 to-cyan-600'
      }
    ]
  },

  // The following methods remain the same as before:
  generateLibrary(allSongs: any[], seed: string, count: number): any[] {
    if (allSongs.length <= count) return allSongs
    const shuffled = this.seededShuffle([...allSongs], seed)
    return shuffled.slice(0, count)
  },

  distributeSongs(librarySongs: any[], initialSeedCount: number): {
    playlistSongs: any[]
    queueSongs: any[]
  } {
    const playlistSongs = librarySongs.slice(0, initialSeedCount)
    const queueSongs = librarySongs.slice(initialSeedCount)
    return { playlistSongs, queueSongs }
  },

  seededShuffle(array: any[], seed: string): any[] {
    const shuffled = [...array]
    const random = this.createSeededRandom(seed)
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  },

  createSeededRandom(seed: string): () => number {
    let state = this.bytes32ToNumber(seed)
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296
      return state / 4294967296
    }
  },

  bytes32ToNumber(bytes32: string): number {
    return parseInt(bytes32.slice(2, 10), 16)
  }
}