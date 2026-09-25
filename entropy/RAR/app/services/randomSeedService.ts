import { songService } from './songService'
import { supabase } from '@/lib/supabase'
import { Song } from '@/types/song'

export const randomSeedService = {
  
  async hasPlaylistsForToday(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]
    
    const { data } = await supabase
      .from('daily_playlists')
      .select('id')
      .eq('day', today)
      .limit(1)
    
    return !!data && data.length > 0
  },

  async getTodaysPlaylists(): Promise<any[]> {
  const today = new Date().toISOString().split('T')[0]
  
  const { data: dailyPlaylists, error } = await supabase
    .from('daily_playlists')
    .select(`
      *,
      playlist_definition:playlist_definitions(*)
    `)
    .eq('day', today)

  if (error) {
    console.error('Error fetching playlists:', error)
    return this.getFallbackPlaylists()
  }
  
  if (!dailyPlaylists || dailyPlaylists.length === 0) {
    return this.getFallbackPlaylists()
  }
  
  // Get all songs to populate the playlist data
  const allSongs = await songService.getSongs()
  const songMap = new Map(allSongs.map(song => [song.id, song]))
  
  // Populate playlists with song data
  return dailyPlaylists.map(dailyPlaylist => ({
    id: dailyPlaylist.id, // This is the important ID for routing
    name: dailyPlaylist.playlist_definition.name,
    description: dailyPlaylist.playlist_definition.description,
    color: dailyPlaylist.playlist_definition.color_gradient,
    songs: dailyPlaylist.song_ids
      .map((songId: string) => songMap.get(songId))
      .filter(Boolean),
    songCount: dailyPlaylist.song_ids.length
  }))
},

  // Fallback playlists (when no auto-generated ones exist)
  getFallbackPlaylists() {
    const fallbacks = [
      { name: "Daily Mix 1", description: "Your personalized mix", color: "bg-gradient-to-br from-purple-900 to-blue-500" },
      { name: "Daily Mix 2", description: "Fresh tracks for you", color: "bg-gradient-to-br from-green-900 to-emerald-500" },
      { name: "Daily Mix 3", description: "Curated just for today", color: "bg-gradient-to-br from-orange-900 to-red-500" },
      { name: "Daily Mix 4", description: "Your daily rotation", color: "bg-gradient-to-br from-blue-900 to-cyan-500" },
      { name: "Daily Mix 5", description: "Today's special mix", color: "bg-gradient-to-br from-pink-900 to-rose-500" },
      { name: "Discover Weekly", description: "New music discoveries", color: "bg-gradient-to-br from-yellow-900 to-amber-500" },
      { name: "Release Radar", description: "Latest releases for you", color: "bg-gradient-to-br from-indigo-900 to-purple-500" },
      { name: "Trending", description: "What's hot right now", color: "bg-gradient-to-br from-red-900 to-orange-500" },
      { name: "Daylist", description: "Music for your day", color: "bg-gradient-to-br from-teal-900 to-green-500" },
      { name: "Rewind", description: "Throwback favorites", color: "bg-gradient-to-br from-gray-900 to-blue-400" }
    ]
    
    return fallbacks.map((fb, index) => ({
      ...fb,
      id: index + 1,
      songs: [],
      songCount: 0
    }))
  }
}