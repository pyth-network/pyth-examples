import PlaylistClient from './PlaylistPageClient'
import { getPlaylistData } from './playlist-data'

interface PlaylistPageProps {
  params: {
    id: string
  }
}

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const playlist = await getPlaylistData(params.id)
  
  return <PlaylistClient playlist={playlist} />
}