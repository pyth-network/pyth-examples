import { supabase } from '@/lib/supabase'

class PlaylistGenerationService {
  private hasGeneratedThisSession = false
  private generationPromise: Promise<boolean> | null = null

  async ensurePlaylistsGenerated(): Promise<boolean> {
    // Quick session check
    if (this.hasGeneratedThisSession) {
      return true
    }

    if (this.generationPromise) {
      return this.generationPromise
    }

    this.generationPromise = this.generatePlaylistsIfNeeded()
    const result = await this.generationPromise
    
    if (result) {
      this.hasGeneratedThisSession = true
    }
    
    return result
  }

  private async generatePlaylistsIfNeeded(): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // FIRST: Check if playlists already exist
      const { data: existingPlaylists } = await supabase
        .from('daily_playlists')
        .select('id')
        .eq('day', today)
        .limit(1)

      // If playlists exist, STOP HERE - no API calls needed
      if (existingPlaylists && existingPlaylists.length > 0) {
        console.log('🎵 Playlists already exist for today - skipping generation')
        return true
      }

      console.log('🔄 No playlists found, starting generation...')

      // SECOND: Check if seed exists before generating
      const { data: existingSeed } = await supabase
        .from('daily_seeds')
        .select('seed_hash')
        .order('created_at', { ascending: false })
        .limit(1)

      // Only call seed API if no seed exists
      if (!existingSeed || existingSeed.length === 0) {
        console.log('🌱 No seed found, generating seed...')
        const seedResponse = await fetch('/api/generate-daily-seed')
        const seedData = await seedResponse.json()

        if (!seedData.success) {
          console.error('❌ Failed to generate seed:', seedData.error)
          return false
        }
        console.log('✅ Seed generated successfully')
      } else {
        console.log('🌱 Using existing seed')
      }

      // THIRD: Generate playlists (this will use the existing or new seed)
      console.log('🎵 Generating playlists...')
      const playlistsResponse = await fetch('/api/generate-playlists')
      const playlistsData = await playlistsResponse.json()

      if (playlistsData.success) {
        console.log('✅ Playlists generated successfully')
        return true
      } else {
        console.error('❌ Failed to generate playlists:', playlistsData.error)
        return false
      }

    } catch (error) {
      console.error('❌ Error in playlist generation:', error)
      return false
    }
  }

  resetSession() {
    this.hasGeneratedThisSession = false
    this.generationPromise = null
  }
}

export const playlistGenerationService = new PlaylistGenerationService()
