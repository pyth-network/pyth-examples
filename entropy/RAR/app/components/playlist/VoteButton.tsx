'use client'

import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { usePlaylistVote } from '@/hooks/usePlaylistVote'

interface VoteButtonsProps {
  playlistId: string
  currentVoteCount: number
  playlistOwner: string
  onVoteUpdate?: (newCount: number) => void
}

export const VoteButtons = ({ 
  playlistId, 
  currentVoteCount, 
  playlistOwner,
  onVoteUpdate 
}: VoteButtonsProps) => {
  const [voteCount, setVoteCount] = useState(currentVoteCount)
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null)
  const { voteOnPlaylist, checkUserVote, isLoading, error } = usePlaylistVote()

  useEffect(() => {
    setVoteCount(currentVoteCount)
  }, [currentVoteCount])

  useEffect(() => {
    const checkVote = async () => {
      const voteData = await checkUserVote(playlistId)
      if (voteData?.hasVoted) {
        setUserVote(voteData.vote.vote_type)
      }
    }
    
    checkVote()
  }, [playlistId, checkUserVote])

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (userVote === voteType) {
      return
    }

    const result = await voteOnPlaylist(playlistId, voteType)
    
    if (result) {
      setUserVote(voteType)
      const newCount = result.newVoteCount
      setVoteCount(newCount)
      onVoteUpdate?.(newCount)
    }
  }

  const getButtonClass = (type: 'upvote' | 'downvote') => {
    const baseClass = "p-2 rounded-full transition-all duration-200 hover:scale-110 "
    
    if (userVote === type) {
      return baseClass + (type === 'upvote' 
        ? "bg-green-500 text-white" 
        : "bg-red-500 text-white")
    }
    
    return baseClass + "bg-gray-700 text-gray-400 hover:bg-gray-600"
  }

  return (
    <div className="flex items-center space-x-3">
      {error && (
        <div className="text-red-500 text-sm mr-2">{error}</div>
      )}
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleVote('upvote')}
          disabled={isLoading}
          className={getButtonClass('upvote')}
          title="Upvote - Grows creator's reputation NFT"
        >
          <ThumbsUp className="w-5 h-5" />
        </button>
        
        <span className={`text-lg font-semibold min-w-8 text-center ${
          voteCount > 0 ? 'text-green-500' : 
          voteCount < 0 ? 'text-red-500' : 
          'text-gray-400'
        }`}>
          {voteCount}
        </span>
        
        <button
          onClick={() => handleVote('downvote')}
          disabled={isLoading}
          className={getButtonClass('downvote')}
          title="Downvote"
        >
          <ThumbsDown className="w-5 h-5" />
        </button>
      </div>
      
      {userVote && (
        <div className="text-xs text-gray-400">
          You {userVote === 'upvote' ? 'upvoted' : 'downvoted'} this playlist
        </div>
      )}
    </div>
  )
}