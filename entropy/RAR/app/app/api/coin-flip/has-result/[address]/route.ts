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
    console.log('Checking if user has result:', userAddress)
    
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(CoinFlipAddress, COIN_FLIP_ABI.abi, provider)
    
    const hasResult = await contract.hasUserResult(userAddress)
    console.log('Has result:', hasResult)
    
    return NextResponse.json({ 
      success: true,
      hasResult
    })
  } catch (error: any) {
    console.error('Error checking user result:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}