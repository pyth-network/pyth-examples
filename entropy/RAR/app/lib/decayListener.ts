import { ethers } from 'ethers'
import { supabase } from './supabase'
import { PlaylistReputationNFT } from '@/contracts/addresses'
import PLAYLIST_REPUTATION_NFT_ABI from '@/contracts/PlaylistReputationNFT.json'

const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc"

export function startDecayListener() {
  console.log('Starting decay event listener...')
  
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const contract = new ethers.Contract(PlaylistReputationNFT, PLAYLIST_REPUTATION_NFT_ABI.abi, provider)

  contract.on('ReputationDecayed', async (tokenId, newReputation, event) => {
    console.log('Decay event detected!', {
      tokenId: tokenId.toString(),
      newReputation: newReputation.toString(),
      txHash: event.transactionHash
    })

    try {
      // Get the token info to find the playlist and owner
      const tokenInfo = await contract.getPlaylistInfo(tokenId)
      const owner = await contract.ownerOf(tokenId)
      
      console.log('Processing decay for:', {
        owner,
        playlistId: tokenInfo.playlistId,
        newReputation: newReputation.toString()
      })

      // Find the user in our database
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', owner.toLowerCase())
        .single()

      if (user) {
        const reputation = Number(newReputation)
        const reputationLevel = Math.floor(reputation / 10)
        
        await supabase
          .from('users')
          .update({ reputation_level: reputationLevel })
          .eq('id', user.id)

        console.log('Updated user reputation after decay:', {
          userId: user.id,
          newLevel: reputationLevel
        })
      }
    } catch (error) {
      console.error('Error processing decay event:', error)
    }
  })

  console.log('Decay listener started')
}
