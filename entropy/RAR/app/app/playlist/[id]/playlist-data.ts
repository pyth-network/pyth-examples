import { supabase } from '@/lib/supabase'
import { songService } from '@/services/songService'

export async function getPlaylistData(playlistId: string) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: dailyPlaylist, error } = await supabase
      .from('daily_playlists')
      .select(`
        *,
        playlist_definition:playlist_definitions(*)
      `)
      .eq('id', playlistId)
      .eq('day', today)
      .single()

    if (error || !dailyPlaylist) {
      console.error('Error fetching playlist:', error)
      return null
    }

    const allSongs = await songService.getSongs()
    const songMap = new Map(allSongs.map(song => [song.id, song]))
    
    const songs = dailyPlaylist.song_ids
      .map((songId: string) => songMap.get(songId))
      .filter(Boolean)

    return {
      id: dailyPlaylist.id,
      name: dailyPlaylist.playlist_definition.name,
      description: dailyPlaylist.playlist_definition.description,
      color: dailyPlaylist.playlist_definition.color_gradient,
      songs: songs,
      songCount: songs.length
    }
  } catch (error) {
    console.error('Error in getPlaylistData:', error)
    return null
  }
}