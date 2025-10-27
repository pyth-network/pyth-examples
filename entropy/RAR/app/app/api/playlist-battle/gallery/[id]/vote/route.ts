import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { userService } from '@/services/userService'
import { ethers } from 'ethers'
import { PlaylistReputationNFT } from '@/contracts/addresses'
import PLAYLIST_REPUTATION_NFT_ABI from '@/contracts/PlaylistReputationNFT.json'

const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc"
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlistId = params.id
    const { userAddress, voteType } = await request.json()

    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 })
    }

    if (!['upvote', 'downvote'].includes(voteType)) {
      return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
    }

    // Get user from database
    const user = await userService.getUserByWalletAddress(userAddress.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the gallery playlist with proper error handling
    const { data: playlist, error: playlistError } = await supabase
      .from('gallery_playlists')
      .select('*')
      .eq('id', playlistId)
      .single()

    if (playlistError || !playlist) {
      console.error('Playlist not found:', playlistError)
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('playlist_votes')
      .select('*')
      .eq('user_id', user.id)
      .eq('gallery_playlist_id', playlistId)
      .single()

    if (existingVote) {
      return NextResponse.json({ 
        error: 'You have already voted on this playlist',
        existingVote 
      }, { status: 400 })
    }

    // Check if user is trying to vote on their own playlist
    if (playlist.user_id === user.id) {
      return NextResponse.json({ 
        error: 'Cannot vote on your own playlist' 
      }, { status: 400 })
    }

    // Record vote in database
    const { data: vote, error: voteError } = await supabase
      .from('playlist_votes')
      .insert({
        user_id: user.id,
        gallery_playlist_id: playlistId,
        vote_type: voteType,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (voteError) {
      console.error('Error recording vote:', voteError)
      return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
    }

    // Update vote count in gallery_playlists
    const voteChange = voteType === 'upvote' ? 1 : -1
    const newVoteCount = (playlist.vote_count || 0) + voteChange

    const { data: updatedPlaylist, error: updateError } = await supabase
      .from('gallery_playlists')
      .update({ 
        vote_count: newVoteCount
      })
      .eq('id', playlistId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating vote count:', updateError)
    }

    // Handle blockchain interactions based on vote type
    if (voteType === 'upvote') {
      try {
        console.log('Processing upvote with growth and potential decay...')
        await handleUpvoteWithDecay(playlistId, playlist.user_id, playlist.playlist_name)
      } catch (blockchainError) {
        console.error('Blockchain operation failed:', blockchainError)
      }
    } else {
      console.log('Downvote recorded - no blockchain interaction')
    }

    return NextResponse.json({ 
      success: true, 
      vote,
      newVoteCount,
      message: `Successfully ${voteType}d playlist!`
    })

  } catch (error: any) {
    console.error('Error voting on playlist:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to vote on playlist' },
      { status: 500 }
    )
  }
}

async function handleUpvoteWithDecay(playlistId: string, playlistOwnerId: string, playlistName: string) {
  if (!PRIVATE_KEY) {
    console.warn('No private key configured for blockchain operations')
    return
  }

  console.log('Starting upvote with potential decay...')

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
    const contract = new ethers.Contract(PlaylistReputationNFT, PLAYLIST_REPUTATION_NFT_ABI.abi, wallet)

    // Get playlist owner's wallet address
    const { data: ownerUser } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', playlistOwnerId)
      .single()

    if (!ownerUser) {
      throw new Error('Playlist owner not found')
    }

    console.log('Finding existing NFT for playlist...')
    let existingTokenId: ethers.BigNumberish | null = null
    
    try {
      const ownerTokens = await contract.tokensOfOwner(ownerUser.wallet_address)
      console.log('Owner tokens:', ownerTokens.map((t: any) => t.toString()))
      
      // Check if any existing token matches this playlist
      for (const token of ownerTokens) {
        try {
          const tokenInfo = await contract.getPlaylistInfo(token)
          console.log(`Token ${token.toString()}:`, {
            playlistId: tokenInfo.playlistId,
            reputation: tokenInfo.reputation.toString()
          })
          
          if (tokenInfo.playlistId === playlistId) {
            existingTokenId = token
            console.log('Found matching token:', token.toString())
            break
          }
        } catch (error) {
          console.log('Error checking token:', token.toString(), error)
          continue
        }
      }
    } catch (error) {
      console.log('Error getting owner tokens:', error)
    }

    if (existingTokenId) {

      console.log('Voting to grow reputation...')
      const voteTx = await contract.voteForPlaylist(existingTokenId)
      const voteReceipt = await voteTx.wait()
      console.log('Growth vote confirmed:', voteReceipt.hash)

      // Get reputation after growth
      const tokenInfoAfterGrowth = await contract.getPlaylistInfo(existingTokenId)
      const reputationAfterGrowth = Number(tokenInfoAfterGrowth.reputation)
      console.log('Reputation after growth:', reputationAfterGrowth)


      if (reputationAfterGrowth > 0) {
        console.log('Triggering decay with 0.001 ETH (should cover fee)...')
        
        try {

          const decayTx = await contract.triggerDecay(existingTokenId, {
            value: ethers.parseEther("0.001") 
          })
          const decayReceipt = await decayTx.wait()
          console.log('Decay triggered:', decayReceipt.hash)
          console.log('Entropy callback will happen asynchronously...')

    
          const reputationLevel = Math.floor(reputationAfterGrowth / 10)
          await supabase
            .from('users')
            .update({ reputation_level: reputationLevel })
            .eq('id', playlistOwnerId)

          console.log('Updated with growth reputation (decay will happen later):', reputationLevel)

        } catch (decayError) {
          console.error('Error triggering decay:', decayError)
          const reputationLevel = Math.floor(reputationAfterGrowth / 10)
          await supabase
            .from('users')
            .update({ reputation_level: reputationLevel })
            .eq('id', playlistOwnerId)
          console.log('Updated with growth-only reputation:', reputationLevel)
        }
      } else {
        console.log('Reputation is 0, skipping decay')
        const reputationLevel = Math.floor(reputationAfterGrowth / 10)
        await supabase
          .from('users')
          .update({ reputation_level: reputationLevel })
          .eq('id', playlistOwnerId)
      }
        
    } else {

      console.log('Minting new NFT (no decay on first mint)...')
      const mintTx = await contract.mintPlaylist(ownerUser.wallet_address, playlistName, playlistId)
      const receipt = await mintTx.wait()
      console.log('New NFT minted:', receipt.hash)


      await supabase
        .from('users')
        .update({ reputation_level: 5 })
        .eq('id', playlistOwnerId)
        
      console.log('Set initial reputation level to 5')
    }

    console.log('Upvote with decay processing completed!')

  } catch (error) {
    console.error('Error in upvote with decay:', error)
    throw error
  }
}


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playlistId = params.id
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('userAddress')

    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 })
    }

    const user = await userService.getUserByWalletAddress(userAddress.toLowerCase())
    if (!user) {
      return NextResponse.json({ hasVoted: false })
    }

    const { data: vote } = await supabase
      .from('playlist_votes')
      .select('*')
      .eq('user_id', user.id)
      .eq('gallery_playlist_id', playlistId)
      .single()

    return NextResponse.json({ 
      hasVoted: !!vote,
      vote: vote || null
    })

  } catch (error: any) {
    console.error('Error checking vote:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check vote' },
      { status: 500 }
    )
  }
}