'use client'

import { useState } from 'react'
import { useAccount, useWalletClient, } from 'wagmi'
import { parseEther, getContract, type WalletClient, createPublicClient, http } from 'viem'
import { baseSepolia } from 'wagmi/chains'
import { CONTRACTS, ENTROPY_BEASTS_ABI } from '@/lib/contracts'
import { IEntropyV2ABI } from '@/lib/abis/IEntropyV2ABI'

export interface Beast {
  tokenId: bigint
  strength: bigint
  intelligence: bigint
}

export async function getFeeV2(gasLimit: number, client: WalletClient): Promise<bigint | null> {
  const entropyContract = getContract({
    address: CONTRACTS.ENTROPY_V2,
    abi: IEntropyV2ABI,
    client: client,
  })
  
  try {
    const fee = await entropyContract.read.getFeeV2([gasLimit])
    console.log('fee', fee)
    return fee
  } catch (error) {
    console.error("Error getting fee", error)
    return null
  }
}

export async function mintBeast(gasLimit: number, isBig: boolean, client: WalletClient, rpcUrl: string): Promise<[string | null, bigint, string | null]> {
  console.log('minting beast', gasLimit, isBig)

  if (!client.account) {
    throw new Error("No account found")
  }
  console.log("Passed gas limit", gasLimit)

  const fee = await getFeeV2(gasLimit, client)
  if (!fee) {
    throw new Error("Failed to get fee")
  }

  const entropyBeastsContract = getContract({
    address: CONTRACTS.ENTROPY_BEASTS,
    abi: ENTROPY_BEASTS_ABI,
    client: client,
  })

  let tx: `0x${string}` | null = null

  try {
    tx =  await entropyBeastsContract.write.mintBeast([gasLimit, isBig], {
      value: fee,
      account: client.account,
      chain: client.chain,
    })
    console.log("tx", tx)
  } catch (error) {
    console.error("Error minting beast", error)
    return [null, BigInt(0), null]
  }

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  })

  await new Promise(resolve => setTimeout(resolve, 2500))

  const txReceipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  console.log('txReceipt', txReceipt)

  try {
    const logs = await publicClient.getContractEvents({
      address: CONTRACTS.ENTROPY_BEASTS,
      abi: ENTROPY_BEASTS_ABI,
      eventName: 'BeastMintRequested' as const,
      fromBlock: txReceipt.blockNumber - BigInt(1),
      toBlock: txReceipt.blockNumber + BigInt(10),
    })
    console.log('logs', logs)
    if (logs.length === 0) {
      throw new Error("No logs found")
    }
    
    return [logs[0]?.args.sequenceNumber?.toString() ?? null, txReceipt.blockNumber, tx]
  } catch (error) {
    console.error("Error getting logs", error)
    return [null, BigInt(0), null]
  }
}

export async function listenForBeastMinted(sequenceNumber: string, requestTxBlockNumber: bigint, client: WalletClient, rpcUrl: string) {
  console.log('listening for beast minted', sequenceNumber, requestTxBlockNumber)
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  })
  
  try {
    // Get current block number to limit the search range
    const currentBlock = await publicClient.getBlockNumber()
    const fromBlock = requestTxBlockNumber
    const toBlock = currentBlock > requestTxBlockNumber + BigInt(20) ? requestTxBlockNumber + BigInt(20) : currentBlock
    
    console.log(`Searching blocks ${fromBlock} to ${toBlock}`)
    
    const logs = await publicClient.getContractEvents({
      address: CONTRACTS.ENTROPY_V2,
      abi: IEntropyV2ABI,
      eventName: 'Revealed' as const,
      fromBlock,
      toBlock,
    })
    
    console.log('logs found:', logs.length)
    
    if (logs.length > 0) {
      for (const log of logs) {
        console.log('Checking log sequence number:', log.args.sequenceNumber?.toString(), 'against:', sequenceNumber)
        if (log.args.sequenceNumber?.toString() === sequenceNumber) {
          console.log('✅ MATCH FOUND! Sequence number matches:', sequenceNumber)
          console.log('found beast minted', log)
          console.log("log.args.callbackFailed: ", log.args.callbackFailed)
          return { logs: [log], error: null }
        }
      }
    }
    
    // If no matching logs found, wait a bit and try again
    console.log('No matching logs found, waiting for next block...')
    
    // Wait a bit and try one more time with a larger block range
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    const currentBlock2 = await publicClient.getBlockNumber()
    const toBlock2 = currentBlock2 > requestTxBlockNumber + BigInt(50) ? requestTxBlockNumber + BigInt(50) : currentBlock2
    
    console.log(`Retrying with larger range: ${fromBlock} to ${toBlock2}`)
    
    const logs2 = await publicClient.getContractEvents({
      address: CONTRACTS.ENTROPY_V2,
      abi: IEntropyV2ABI,
      eventName: 'Revealed' as const,
      fromBlock,
      toBlock: toBlock2,
    })
    
    console.log('Retry logs found:', logs2.length)
    
    if (logs2.length > 0) {
      for (const log of logs2) {
        console.log('Retry checking log sequence number:', log.args.sequenceNumber?.toString(), 'against:', sequenceNumber)
        if (log.args.sequenceNumber?.toString() === sequenceNumber) {
          console.log('✅ MATCH FOUND on retry! Sequence number matches:', sequenceNumber)
          console.log('found beast minted', log)
          console.log("log.args.callbackFailed: ", log.args.callbackFailed)
          return { logs: [log], error: null }
        }
      }
    }
    
    return { logs: [], error: null }
    
  } catch (error) {
    console.error("Error getting logs:", error)
    return { logs: [], error: error }
  }
}




export function useEntropyBeasts(rpcUrl: string) {
  const { data: client } = useWalletClient()
  const [isMinting, setIsMinting] = useState(false)
  const [mintSequenceNumber, setMintSequenceNumber] = useState<string | null>(null)
  const [mintError, setMintError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)
  const [callbackCompleted, setCallbackCompleted] = useState(false)
  const [revealedEvent, setRevealedEvent] = useState<any>(null)

  const mint = async (gasLimit: number, isBig: boolean) => {
    // Reset all states to default before starting
    setIsMinting(true)
    setMintError(null)
    setIsListening(false)
    setTransactionHash(null)
    setMintSequenceNumber(null)
    setCallbackCompleted(false)
    setRevealedEvent(null)
    
    if (!client) {
      setMintError("No client found")
      setIsMinting(false)
      return
    }
    
    try {
      const [sequenceNumber, requestTxBlockNumber, txHash] = await mintBeast(gasLimit, isBig, client, rpcUrl)
      
      if (sequenceNumber) {
        setMintSequenceNumber(sequenceNumber)
        setTransactionHash(txHash)
        setIsListening(true)
        
        console.log('listening for beast minted', sequenceNumber, requestTxBlockNumber)
        await new Promise(resolve => setTimeout(resolve, 10000))
        
        try {
          const result = await listenForBeastMinted(sequenceNumber, requestTxBlockNumber, client, rpcUrl)
          
          console.log('listenForBeastMinted result:', result)
          console.log('result.logs.length:', result.logs.length)
          
          // Check if we got the callback result
          if (result.logs.length > 0) {
            const log = result.logs[0]
            console.log("✅ Callback completed successfully!")
            console.log("log.args.callbackFailed:", log.args.callbackFailed)
            console.log("Full log object:", log)
            setCallbackCompleted(true)
            setRevealedEvent(log)
          } else {
            console.log("❌ No matching logs found in listenForBeastMinted")
          }
        } catch (error) {
          console.error("Error listening for beast minted:", error)
        } finally {
          setIsListening(false)
        }
      } else {
        setMintError("Failed to mint beast")
      }
    } catch (error) {
      console.error("Error in mint function:", error)
      setMintError("Minting failed")
    } finally {
      setIsMinting(false)
    }
  }

  return {
    // State
    isMinting,
    mintSequenceNumber,
    mintError,
    isListening,
    transactionHash,
    callbackCompleted,
    revealedEvent,
    
    // Actions
    mint,
  }
}
