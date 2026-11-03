export interface GalleryPlaylist {
  id: string
  playlist_name: string
  playlist_description: string
  playlist_songs: string[]
  energy_remaining: number
  likes: number
  play_count: number
  vote_count: number
  submitted_at: string
  user: {
    username: string
    wallet_address: string
    reputation_level: number
  }
  playlist_prompt: {
    id: string
    name: string
    description: string
    color_gradient: string
  }
}

export interface PlaylistVote {
  id: string
  user_id: string
  gallery_playlist_id: string
  vote_type: 'upvote' | 'downvote'
  created_at: string
}
