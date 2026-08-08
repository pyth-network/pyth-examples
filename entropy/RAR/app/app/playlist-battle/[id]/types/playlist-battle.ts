export interface Song {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  file_path: string
  likes: number
  play_count: number
}

export interface PlaylistPrompt {
  name: string
  description: string
  color_gradient: string
}

export interface BattleInstance {
  id: string
  user_id: string
  playlist_prompt: PlaylistPrompt
  random_seed: string
  coin_flip_result: boolean
  initial_seed_count: number
  library_songs: string[]
  playlist_songs: string[]
  queue_songs: string[]
  created_at: string
}

export interface RevealResult {
  revealed: boolean
  song?: Song
}

export interface RevealStats {
  numbers: number
  letters: number
  total: number
}

export interface BattleInstance {
  id: string
  user_id: string
  playlist_prompt: PlaylistPrompt
  random_seed: string
  coin_flip_result: boolean
  initial_seed_count: number
  library_songs: string[]
  playlist_songs: string[]
  queue_songs: string[]
  energy_units: number 
  created_at: string
}