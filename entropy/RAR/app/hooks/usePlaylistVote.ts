import { useState } from 'react'
import { useAccount } from 'wagmi'

export const usePlaylistVote = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { address } = useAccount()

  const voteOnPlaylist = async (playlistId: string, voteType: 'upvote' | 'downvote') => {
    if (!address) {
      setError('Please connect your wallet to vote')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/playlist-battle/gallery/${playlistId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userAddress: address,
          voteType 
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to vote')
      }

      return data
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const checkUserVote = async (playlistId: string) => {
    if (!address) return null

    try {
      const response = await fetch(`/api/playlist-battle/gallery/${playlistId}/vote?userAddress=${address}`)
      const data = await response.json()
      
      if (data.error) {
        console.error('Error checking vote:', data.error)
        return null
      }

      return data
    } catch (err) {
      console.error('Error checking vote:', err)
      return null
    }
  }

  return {
    voteOnPlaylist,
    checkUserVote,
    isLoading,
    error,
    clearError: () => setError(null)
  }
}