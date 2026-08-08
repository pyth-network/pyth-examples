import { CoinFlipAddress } from '@/contracts/addresses'
import COIN_FLIP_ABI from '@/contracts/CoinFlip.json'
import { ethers } from 'ethers'

// Create a provider (you might want to use your existing provider setup)
const getProvider = () => {
  const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc"
  return new ethers.JsonRpcProvider(RPC_URL)
}

// Create a wallet instance for write operations (if needed)
const getWallet = () => {
  const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY
  if (!PRIVATE_KEY) {
    throw new Error('WALLET_PRIVATE_KEY environment variable is not set')
  }
  const provider = getProvider()
  return new ethers.Wallet(PRIVATE_KEY, provider)
}

export const coinFlipService = {

  async requestRandom(userAddress: string): Promise<{ sequenceNumber: string; txHash: string }> {
    try {
      console.log('Requesting random number from CoinFlip contract...')
      
      const wallet = getWallet()
      const contract = new ethers.Contract(CoinFlipAddress, COIN_FLIP_ABI.abi, wallet)
      
      // Get the required fee
      const fee = await contract.getRequestFee()
      console.log('Required fee:', ethers.formatEther(fee), 'ETH')
      
      // Request random number
      const tx = await contract.requestRandom({ value: fee })
      console.log('Transaction sent:', tx.hash)
      
      const receipt = await tx.wait()
      console.log('Transaction confirmed in block:', receipt.blockNumber)
      
      // Extract sequence number from events
      const event = receipt.logs.find((log: any) => 
        log.address.toLowerCase() === CoinFlipAddress.toLowerCase()
      )
      
      let sequenceNumber = '0'
      if (event) {
        const iface = new ethers.Interface(COIN_FLIP_ABI.abi)
        const parsedLog = iface.parseLog(event)
        if (parsedLog && parsedLog.name === 'RandomRequest') {
          sequenceNumber = parsedLog.args.sequenceNumber.toString()
        }
      }
      
      return {
        sequenceNumber,
        txHash: tx.hash
      }
      
    } catch (error: any) {
      console.error('Error requesting random number:', error)
      throw new Error(`Failed to request random number: ${error.message}`)
    }
  },

  // Check if user has a result
  async hasUserResult(userAddress: string): Promise<boolean> {
    try {
      console.log('Checking if user has result:', userAddress)
      
      const provider = getProvider()
      const contract = new ethers.Contract(CoinFlipAddress, COIN_FLIP_ABI.abi, provider)
      
      const hasResult = await contract.hasUserResult(userAddress)
      console.log('User has result:', hasResult)
      
      return hasResult
      
    } catch (error: any) {
      console.error('Error checking user result:', error)
      throw new Error(`Failed to check user result: ${error.message}`)
    }
  },

  // Get user's random result
  async getUserResult(userAddress: string): Promise<{
    randomNumber: string
    isHeads: boolean
    timestamp: number
    exists: boolean
  }> {
    try {
      console.log('Getting user result for:', userAddress)
      
      const provider = getProvider()
      const contract = new ethers.Contract(CoinFlipAddress, COIN_FLIP_ABI.abi, provider)
      
      const result = await contract.getUserResult(userAddress)
      console.log('Raw result:', result)
      
      const [randomNumber, isHeads, timestamp, exists] = result
      
      return {
        randomNumber,
        isHeads,
        timestamp: Number(timestamp),
        exists
      }
      
    } catch (error: any) {
      console.error('Error getting user result:', error)
      throw new Error(`Failed to get user result: ${error.message}`)
    }
  },

  // Alternative implementation using event listening for real-time updates
  async waitForUserResult(userAddress: string, timeoutMs = 60000): Promise<{
    randomNumber: string
    isHeads: boolean
    timestamp: number
    exists: boolean
  }> {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now()
      
      const checkInterval = setInterval(async () => {
        try {
          // Check if timeout reached
          if (Date.now() - startTime > timeoutMs) {
            clearInterval(checkInterval)
            reject(new Error('Timeout waiting for random result'))
            return
          }
          
          // Check if result exists
          const hasResult = await this.hasUserResult(userAddress)
          if (hasResult) {
            clearInterval(checkInterval)
            const result = await this.getUserResult(userAddress)
            resolve(result)
          }
        } catch (error) {
          clearInterval(checkInterval)
          reject(error)
        }
      }, 2000) // Check every 2 seconds
    })
  },

  // Get the current request fee
  async getRequestFee(): Promise<string> {
    try {
      const provider = getProvider()
      const contract = new ethers.Contract(CoinFlipAddress, COIN_FLIP_ABI.abi, provider)
      
      const fee = await contract.getRequestFee()
      return ethers.formatEther(fee)
      
    } catch (error: any) {
      console.error('Error getting request fee:', error)
      throw new Error(`Failed to get request fee: ${error.message}`)
    }
  }
}