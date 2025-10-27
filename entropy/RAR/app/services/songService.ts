import { supabase } from '@/lib/supabase'
import { Song, UploadSongData } from '@/types/song'
import { useUser } from '@/contexts/UserContext'

export const songService = {

   async uploadSong(songData: UploadSongData, userId?: string) {
    try {
      const { title, artist, album, file } = songData
      
      // Generate unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `songs/${fileName}`


      // Upload file to Supabase Storage
       const { data: uploadData, error: uploadError } = await supabase.storage
        .from('songs')
        .upload(filePath, file)

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL for the uploaded file
       const { data: { publicUrl } } = supabase.storage
        .from('songs')
        .getPublicUrl(filePath)

      // Create song record in database with user association
      const songDataToInsert: any = {
        title,
        artist,
        album,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        duration: 0,
      }

      // Add user_id if available
      if (userId) {
        songDataToInsert.user_id = userId
      }

      const { data: song, error: dbError } = await supabase
        .from('songs')
        .insert(songDataToInsert)
        .select()
        .single()

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('songs').remove([filePath])
        throw new Error(`Database error: ${dbError.message}`)
      }

      return {
        song,
        publicUrl
      }
    } catch (error) {
      console.error('Error uploading song:', error)
      throw error
    }
  },

  // Get all songs
  async getSongs(): Promise<Song[]> {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch songs: ${error.message}`)
    }

    return data || []
  },

  // Get song by ID
  async getSongById(id: string): Promise<Song | null> {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching song:', error)
      return null
    }

    return data
  },

  // Get public URL for song file
  getSongUrl(filePath: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from('songs')
      .getPublicUrl(filePath)
    
    return publicUrl
  },

  // Increment play count
  async incrementPlayCount(songId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_play_count', { song_id: songId })
    
    if (error) {
      console.error('Error incrementing play count:', error)
    }
  },

  // Like a song
  async likeSong(songId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_likes', { song_id: songId })
    
    if (error) {
      console.error('Error liking song:', error)
    }
  }
}