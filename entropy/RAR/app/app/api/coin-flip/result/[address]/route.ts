import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { CoinFlipAddress } from '@/contracts/addresses'
import COIN_FLIP_ABI from '@/contracts/CoinFlip.json'

const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc"

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const userAddress = params.address
    console.log('Getting result for:', userAddress)
    
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(CoinFlipAddress, COIN_FLIP_ABI.abi, provider)
    
    const result = await contract.getUserResult(userAddress)
    
    // Log the format for debugging
    console.log('Raw contract result:', result)
    console.log('Random number format:', result[0])
    console.log('Type of random number:', typeof result[0])
    
    return NextResponse.json({ 
      success: true,
      result: {
        randomNumber: result[0], 
        isHeads: result[1],
        timestamp: Number(result[2]),
        exists: result[3]
      }
    })
  } catch (error: any) {
    console.error('Error getting user result:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}