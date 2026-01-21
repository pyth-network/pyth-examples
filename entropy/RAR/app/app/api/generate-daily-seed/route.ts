import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { supabase } from '@/lib/supabase'

import RANDOM_SEED_ARTIFACT from '@/contracts/RandomSeed.json'

const RANDOM_SEED_ABI = RANDOM_SEED_ARTIFACT.abi
const CONTRACT_ADDRESS = "0xA13C674F8A8715E157BA42237A6b1Dff24EE274F"

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY
const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Connecting to RPC:', RPC_URL)
    
    if (!PRIVATE_KEY) {
      throw new Error('WALLET_PRIVATE_KEY environment variable is not set')
    }

    if (!RPC_URL) {
      throw new Error('ARBITRUM_SEPOLIA_RPC_URL environment variable is not set')
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, RANDOM_SEED_ABI, wallet)

    console.log('Checking current seed...')
    const currentSeed = await contract.currentSeed()
    console.log('Current seed:', currentSeed)
    
    if (currentSeed !== '0x0000000000000000000000000000000000000000000000000000000000000000') {

      await supabase
        .from('daily_seeds')
        .insert({ 
          seed_hash: currentSeed,
          block_timestamp: new Date().toISOString()
        })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Seed already exists',
        seed: currentSeed 
      })
    }

    console.log('Requesting new seed...')
    const fee = ethers.parseEther("0.0005")
    const tx = await contract.requestRandomSeed({ value: fee })
    console.log('Transaction sent:', tx.hash)
    
    const receipt = await tx.wait()
    console.log('Transaction confirmed in block:', receipt.blockNumber)

    console.log('Waiting for entropy callback (30 seconds)...')
    await new Promise(resolve => setTimeout(resolve, 30000))

    const newSeed = await contract.currentSeed()
    console.log('New seed after wait:', newSeed)
    
    if (newSeed === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new Error('Seed still not generated after callback wait')
    }

    // Store the new seed in database
    await supabase
      .from('daily_seeds')
      .insert({ 
        seed_hash: newSeed,
        block_timestamp: new Date().toISOString()
      })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Seed generated successfully',
      seed: newSeed,
      transactionHash: tx.hash
    })

  } catch (error: any) {
    console.error('Error generating seed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to generate seed' 
    }, { status: 500 })
  }
}