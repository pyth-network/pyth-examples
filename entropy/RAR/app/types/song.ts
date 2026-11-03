export interface Song {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  file_path: string
  file_size: number
  mime_type: string
  uploader_ip?: string
  created_at: string
  play_count: number
  likes: number
}

export interface UploadSongData {
  title: string
  artist: string
  album?: string
  file: File
}