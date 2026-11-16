"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, ExternalLink, CheckCircle2, Loader2, Info, AlertCircle } from "lucide-react"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useChainId, usePublicClient } from "wagmi"
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from "@/config/contracts"
import lotteryAbi from "@/abis/MegaYieldLottery.json"
import { useState, useEffect, useCallback, useRef } from "react"
import { formatEther, decodeEventLog } from "viem"
import { useLottery } from "@/hooks/useLottery"

// Extract ABI from Hardhat artifact (which has structure { abi: [...] })
const LOTTERY_ABI = (lotteryAbi as any).abi || lotteryAbi

interface DrawHistory {
  txHash: string
  sequenceNumber: bigint
  day: bigint
  timestamp: number
  winnerDrawn: boolean
}

interface PythCallbackTx {
  txHash: string
  blockNumber: bigint
  timestamp: number
  day: bigint
  winner: string
  jackpot: bigint
}

export function PythVerification() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const lotteryAddress = CONTRACT_ADDRESSES.baseSepolia.lottery as `0x${string}`
  const explorerUrl = NETWORK_CONFIG[chainId as keyof typeof NETWORK_CONFIG]?.explorerUrl || "https://basescan.org"
  
  // Get lottery state to check conditions
  // Removed dayInfo and isLoadingLottery - no longer using getCurrentDayInfo
  
  // Use pythIntegration address from config as fallback
  const configPythIntegration = CONTRACT_ADDRESSES.baseSepolia.pythIntegration as `0x${string}`
  
  const [pythRequestTxHash, setPythRequestTxHash] = useState<string | null>(null)
  const [sequenceNumber, setSequenceNumber] = useState<bigint | null>(null)
  const [pythContractAddress, setPythContractAddress] = useState<string | null>(null)
  const [drawHistory, setDrawHistory] = useState<DrawHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const isLoadingRef = useRef(false)
  const [pythCallbackTxs, setPythCallbackTxs] = useState<PythCallbackTx[]>([])
  const [isLoadingCallbacks, setIsLoadingCallbacks] = useState(false)

  // Get Pyth Integration address from contract (fallback to config)
  const { data: pythIntegrationAddressFromContract } = useReadContract({
    address: lotteryAddress,
    abi: LOTTERY_ABI,
    functionName: "pythIntegration",
  })
  
  // Use contract address if available, otherwise use config address
  const pythIntegrationAddress = (pythIntegrationAddressFromContract || configPythIntegration) as `0x${string}`

  // Get Pyth contract address from PythIntegration
  const { data: pythAddress } = useReadContract({
    address: pythIntegrationAddress as `0x${string}` | undefined,
    abi: [
      {
        inputs: [],
        name: "pyth",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "pyth",
    query: { enabled: !!pythIntegrationAddress },
  })

  useEffect(() => {
    if (pythAddress) {
      setPythContractAddress(pythAddress as string)
    }
  }, [pythAddress])

  // Get required fee from Pyth documentation
  // According to Pyth Entropy current fees: https://docs.pyth.network/entropy/current-fees
  // Base Sepolia: 0.000015000 ETH = 15,000 gwei = 15,000,000,000,000 wei
  // Source: https://docs.pyth.network/entropy/current-fees
  const PYTH_FEE_BASE_SEPOLIA = BigInt("15000000000000") // 15,000 gwei = 0.000015 ETH
  
  // The tutorial shows that pyth.fee() may not be callable directly from frontend
  // So we use the documented fee value from: https://docs.pyth.network/entropy/contract-addresses
  const requiredFee = PYTH_FEE_BASE_SEPOLIA
  const isLoadingFee = false
  const feeError = null
  
  // Using documented fee value directly (following tutorial approach)
  // This avoids issues with pyth.fee() reverting when called from frontend

  // Debug logging
  useEffect(() => {
    if (feeError) {
      console.error("Error loading fee from contract:", feeError)
    }
    if (pythIntegrationAddress) {
      console.log("PythIntegration address:", pythIntegrationAddress)
    }
    if (requiredFee) {
      // Ensure we have a proper BigInt
      const feeValue = typeof requiredFee === 'bigint' ? requiredFee : BigInt(String(requiredFee))
      console.log("Required fee (BigInt):", feeValue.toString(), "wei")
      console.log("Required fee (ETH):", formatEther(feeValue))
      console.log("Required fee type:", typeof requiredFee)
      console.log("Required fee value:", requiredFee)
      console.log("Using documented Pyth fee from: https://docs.pyth.network/entropy/contract-addresses")
      // Verify the value is correct (15,000 gwei = 15,000,000,000,000 wei = 0.000015 ETH)
      const expectedFee = BigInt("15000000000000") // 15,000 gwei = 0.000015 ETH
      if (feeValue.toString() !== expectedFee.toString()) {
        console.warn("Fee value differs from expected:", feeValue.toString(), "wei (expected:", expectedFee.toString(), "wei)")
      } else {
        console.log("✓ Fee value is correct: 15,000 gwei = 0.000015 ETH (from https://docs.pyth.network/entropy/current-fees)")
      }
    }
  }, [pythIntegrationAddress, requiredFee])

  // Watch for RandomNumberRequested events
  useWatchContractEvent({
    address: lotteryAddress,
    abi: LOTTERY_ABI,
    eventName: "RandomNumberRequested",
    onLogs(logs) {
      // Get the latest event
      const latestLog = logs[logs.length - 1]
      if (latestLog) {
        try {
          // The event has args: sequenceNumber, day
          const decoded = (latestLog as any).args
          if (decoded && decoded[0]) {
            setSequenceNumber(decoded[0] as bigint)
          }
        } catch (error) {
          console.error("Error decoding event:", error)
        }
      }
    },
  })

  // Load draw history from past events
  const loadDrawHistory = useCallback(async () => {
    if (!publicClient || isLoadingRef.current) return
    
    isLoadingRef.current = true
    setIsLoadingHistory(true)
    try {
      // Get the current block number to limit search range
      // Search last 50,000 blocks (approximately 1 week on Base) to avoid RPC limits
      const currentBlock = await publicClient.getBlockNumber()
      const maxRange = BigInt(50000) // Reduced to 50k to stay well under RPC limit
      const fromBlock = currentBlock > maxRange ? currentBlock - maxRange : BigInt(0)

      // Get all RandomNumberRequested events
      const logs = await publicClient.getLogs({
        address: lotteryAddress,
        event: {
          type: "event",
          name: "RandomNumberRequested",
          inputs: LOTTERY_ABI.find((item: any) => 
            item.type === "event" && item.name === "RandomNumberRequested"
          )?.inputs || [],
        } as any,
        fromBlock: fromBlock,
        toBlock: currentBlock,
      })

      const history: DrawHistory[] = []
      
      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: LOTTERY_ABI,
            eventName: "RandomNumberRequested",
            data: log.data,
            topics: log.topics,
          })
          
          const seqNum = (decoded.args as any)[0] as bigint
          const day = (decoded.args as any)[1] as bigint
          
          // Check if winner was drawn for this day
          const dayDrawn = await publicClient.readContract({
            address: lotteryAddress,
            abi: LOTTERY_ABI,
            functionName: "dayDrawn",
            args: [day],
          })
          
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
          
          history.push({
            txHash: log.transactionHash,
            sequenceNumber: seqNum,
            day,
            timestamp: Number(block.timestamp),
            winnerDrawn: dayDrawn as boolean,
          })
        } catch (error) {
          console.error("Error processing log:", error)
        }
      }
      
      // Sort by timestamp (newest first)
      history.sort((a, b) => b.timestamp - a.timestamp)
      setDrawHistory(history.slice(0, 5)) // Show last 5
    } catch (error) {
      console.error("Error loading draw history:", error)
    } finally {
      setIsLoadingHistory(false)
      isLoadingRef.current = false
    }
  }, [publicClient, lotteryAddress])

  // Watch for WinnerDrawn events to verify callback was called
  useWatchContractEvent({
    address: lotteryAddress,
    abi: LOTTERY_ABI,
    eventName: "WinnerDrawn",
    onLogs() {
      // Winner was drawn, meaning Pyth callback was executed
      // Refresh history after a short delay to avoid rapid calls
      if (publicClient && !isLoadingRef.current) {
        setTimeout(() => {
          loadDrawHistory()
        }, 1000)
      }
    },
  })

  useEffect(() => {
    if (publicClient && pythContractAddress) {
      loadDrawHistory()
    }
  }, [publicClient, pythContractAddress, loadDrawHistory])

  const { writeContract, data: drawHash, isPending: isDrawing, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: drawSuccess, isError: isReceiptError } = useWaitForTransactionReceipt({ hash: drawHash })

  useEffect(() => {
    if (drawHash) {
      console.log("Draw transaction hash received:", drawHash)
      setPythRequestTxHash(drawHash)
    }
  }, [drawHash])

  // Log write errors
  useEffect(() => {
    if (writeError) {
      console.error("Write contract error:", writeError)
      const errorMessage = (writeError as any)?.message || (writeError as any)?.shortMessage || "Unknown error"
      alert(`Transaction error: ${errorMessage}\n\nCheck console for details.`)
    }
  }, [writeError])

  const handleRequestDraw = async () => {
    console.log("=== handleRequestDraw called ===")
    console.log("requiredFee:", requiredFee)
    console.log("isDrawing:", isDrawing)
    console.log("isConfirming:", isConfirming)
    console.log("isLoadingFee:", isLoadingFee)
    console.log("lotteryAddress:", lotteryAddress)
    
    if (!address) {
      alert("Please connect your wallet first")
      return
    }

    if (!requiredFee) {
      console.error("Required fee not available")
      alert("Fee not available. Please wait for it to load.")
      return
    }

    // Ensure we're using the correct fee (15,000 gwei = 0.000015 ETH minimum)
    // If the fee is less than 15,000 gwei, use the fallback
    const MIN_FEE = BigInt("15000000000000") // 15,000 gwei = 0.000015 ETH
    const feeToUse = requiredFee >= MIN_FEE ? requiredFee : MIN_FEE

    console.log("=== Request Draw Debug ===")
    console.log("Required fee from contract/fallback:", requiredFee.toString(), "wei")
    console.log("Fee in ETH:", formatEther(requiredFee))
    console.log("Minimum required fee:", MIN_FEE.toString(), "wei")
    console.log("Fee to use:", feeToUse.toString(), "wei")
    console.log("Fee to use in ETH:", formatEther(feeToUse))
    console.log("Expected: 15,000 gwei = 0.000015 ETH (from https://docs.pyth.network/entropy/current-fees)")
      console.log("Calling writeContract with:", {
        address: lotteryAddress,
        functionName: "requestDrawWinner",
        value: feeToUse.toString()
      })
      console.log("========================")

      if (feeToUse < MIN_FEE) {
        console.error("ERROR: Fee is too low! Using minimum fee of 15,000 gwei (0.000015 ETH)")
      }

      try {
        console.log("Calling writeContract...")
        // writeContract is not async - it triggers the wallet prompt
        writeContract({
          address: lotteryAddress,
          abi: LOTTERY_ABI,
          functionName: "requestDrawWinner",
          args: [], // Empty array for functions with no parameters
          value: feeToUse,
        })
      console.log("writeContract called successfully - wallet prompt should appear")
    } catch (error: any) {
      console.error("Error requesting draw:", error)
      let errorMessage = "Unknown error"
      
      // Try to extract revert reason
      if (error?.message) {
        errorMessage = error.message
      } else if ((error as any)?.shortMessage) {
        errorMessage = (error as any).shortMessage
      } else if (error?.cause?.data) {
        errorMessage = `Revert reason: ${error.cause.data}`
      }
      
      alert(`Transaction failed: ${errorMessage}\n\nCheck console for details.`)
    }
  }
  
  // Check if draw is possible
  // Removed canDraw check - no longer using dayInfo

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Pyth Entropy Verification</h3>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Pyth Entropy Contract</p>
            {pythContractAddress ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {pythContractAddress.slice(0, 10)}...{pythContractAddress.slice(-8)}
                  </code>
                  <a
                    href={`${explorerUrl}/address/${pythContractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    View Contract
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <a
                  href={`${explorerUrl}/address/${pythContractAddress}#internaltx`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View Internal Transactions (Pyth Callbacks)
                  <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-xs text-muted-foreground">
                  Internal transactions show when Pyth calls <code className="bg-muted px-1 rounded">entropyCallback()</code> on our contract
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Loading...</p>
            )}
          </div>

          <div>
            <p className="text-muted-foreground mb-1">Required Fee</p>
            {isLoadingFee ? (
              <p className="text-xs text-muted-foreground">Loading from contract...</p>
            ) : requiredFee ? (
              <div>
                {/* Format fee correctly using formatEther */}
                {(() => {
                  const feeValue = typeof requiredFee === 'bigint' ? requiredFee : BigInt(String(requiredFee))
                  // formatEther correctly converts wei to ETH (divides by 10^18)
                  return <p className="font-semibold">{formatEther(feeValue)} ETH</p>
                })()}
                <p className="text-xs text-muted-foreground mt-1">
                  Fee from <a href="https://docs.pyth.network/entropy/current-fees" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Pyth current fees</a>: 0.000015 ETH for Base Sepolia
                </p>
              </div>
            ) : (
              <p className="text-xs text-red-500">Unable to determine fee. Please check your connection.</p>
            )}
          </div>

          {sequenceNumber !== null && (
            <div>
              <p className="text-muted-foreground mb-1">Sequence Number</p>
              <p className="font-mono text-xs bg-muted px-2 py-1 rounded inline-block">
                {sequenceNumber.toString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This sequence number is used by Pyth to track your random number request
              </p>
            </div>
          )}

          {pythRequestTxHash && (
            <div>
              <p className="text-muted-foreground mb-2">Transaction to Pyth</p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono">
                    {pythRequestTxHash.slice(0, 10)}...{pythRequestTxHash.slice(-8)}
                  </span>
                  <a
                    href={`${explorerUrl}/tx/${pythRequestTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-xs"
                  >
                    View on BaseScan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {drawSuccess && (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Transaction confirmed - Pyth will call back automatically
                  </div>
                )}
              </div>
            </div>
          )}

          {isConnected && (
            <div className="pt-4 border-t border-border space-y-3">
              <Button
                onClick={handleRequestDraw}
                disabled={isDrawing || isConfirming || !requiredFee || isLoadingFee || !isConnected}
                className="w-full"
                variant="outline"
                title={
                  !isConnected 
                    ? "Connect wallet first"
                    : !requiredFee 
                    ? "Fee not available"
                    : isDrawing || isConfirming
                    ? "Transaction in progress..."
                    : "Click to request random number from Pyth"
                }
              >
                {!isConnected ? (
                  "Connect Wallet First"
                ) : isDrawing || isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Requesting Random Number...
                  </>
                ) : isLoadingFee ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading fee...
                  </>
                ) : !requiredFee ? (
                  "Fee not available"
                ) : (
                  "Request Draw (Trigger Pyth)"
                )}
              </Button>
              {!isConnected && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 text-center">
                  Please connect your wallet to request a draw
                </p>
              )}
              {!requiredFee && !isLoadingFee && (
                <p className="text-xs text-red-500 mt-2 text-center">
                  Unable to load required fee. Please check your network connection.
                </p>
              )}
              {requiredFee && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  This will call requestDrawWinner() which interacts with Pyth Entropy
                </p>
              )}
            </div>
          )}
        </div>

        {/* Draw History */}
        {drawHistory.length > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-sm font-semibold mb-3">Recent Draw Requests</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {isLoadingHistory ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                drawHistory.map((draw, idx) => (
                  <div key={idx} className="bg-muted/50 rounded-lg p-3 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-mono text-xs">
                          {draw.txHash.slice(0, 10)}...{draw.txHash.slice(-8)}
                        </p>
                        <p className="text-muted-foreground mt-1">
                          Sequence: {draw.sequenceNumber.toString()} | Day: {draw.day.toString()}
                        </p>
                      </div>
                      <a
                        href={`${explorerUrl}/tx/${draw.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        View
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {draw.winnerDrawn ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Winner drawn (Pyth callback executed)
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Waiting for Pyth callback...
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Pyth Callback Transactions */}
        {pythContractAddress && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Pyth Entropy Callback Transactions</h4>
              {isLoadingCallbacks && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              These transactions show when Pyth Entropy called <code className="bg-muted px-1 rounded">entropyCallback()</code> on our contract.
              Each <code className="bg-muted px-1 rounded">WinnerDrawn</code> event indicates Pyth provided the random number.
            </p>
            {isLoadingCallbacks ? (
              <p className="text-xs text-muted-foreground">Loading callback transactions...</p>
            ) : pythCallbackTxs.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pythCallbackTxs.map((tx, idx) => (
                  <div key={idx} className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">
                        {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                      </span>
                      <a
                        href={`${explorerUrl}/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        View on BaseScan
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="text-muted-foreground space-y-0.5">
                      <p>Day: {tx.day.toString()}</p>
                      <p>Winner: <span className="font-mono">{tx.winner.slice(0, 6)}...{tx.winner.slice(-4)}</span></p>
                      <p>Jackpot: {formatEther(tx.jackpot)} USDC</p>
                      <p>Block: {tx.blockNumber.toString()}</p>
                      <p>Time: {new Date(tx.timestamp * 1000).toLocaleString()}</p>
                    </div>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-green-600 dark:text-green-400 text-xs">
                        ✓ This transaction shows Pyth Entropy successfully called the callback
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No callback transactions found yet. Draw a winner to see Pyth's callback in action.</p>
            )}
          </div>
        )}

        <div className="bg-accent/10 rounded-lg p-4 border border-accent/20 mt-4">
            <div className="flex items-start gap-2 mb-2">
            <Info className="w-4 h-4 text-accent mt-0.5" />
            <p className="text-xs font-semibold text-foreground">How to Verify On-Chain That Randomness Comes from Pyth</p>
          </div>
          <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
            <div>
              <strong className="text-foreground">Step 1: Find the Request Transaction</strong>
              <p className="mt-1">
                Go to BaseScan and find the transaction where <code className="bg-background px-1 rounded">requestDrawWinner()</code> was called.
                Look for the event <code className="bg-background px-1 rounded">RandomNumberRequested</code> with the sequence number.
              </p>
            </div>
            
            <div>
              <strong className="text-foreground">Step 2: Check Internal Transactions</strong>
              <p className="mt-1">
                In the same transaction, scroll to <strong>"Internal Transactions"</strong> tab. You'll see:
              </p>
              <ul className="list-disc list-inside ml-3 mt-1 space-y-1">
                <li><code className="bg-background px-1 rounded">PythIntegration.requestRandomNumber()</code> called</li>
                <li>Which internally calls <code className="bg-background px-1 rounded">Pyth Entropy.requestV2()</code></li>
                <li>This sends ETH to Pyth contract: <code className="bg-background px-1 rounded">0.000015 ETH</code></li>
              </ul>
            </div>

            <div>
              <strong className="text-foreground">Step 3: Find Pyth's Callback Transaction</strong>
              <p className="mt-1">
                After ~1 block, Pyth will call back. To find it:
              </p>
              <ol className="list-decimal list-inside ml-3 mt-1 space-y-1">
                <li>Go to the <a href={`${explorerUrl}/address/${lotteryAddress}#internaltx`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Internal Transactions</a> of the lottery contract</li>
                <li>Look for a transaction <strong>FROM</strong> <code className="bg-background px-1 rounded">{pythContractAddress ? `${pythContractAddress.slice(0, 10)}...${pythContractAddress.slice(-8)}` : "Pyth Contract"}</code></li>
                <li>This transaction calls <code className="bg-background px-1 rounded">entropyCallback()</code> on our contract</li>
              </ol>
            </div>

            <div>
              <strong className="text-foreground">Step 4: Verify the Callback</strong>
              <p className="mt-1">
                In the callback transaction, check:
              </p>
              <ul className="list-disc list-inside ml-3 mt-1 space-y-1">
                <li><strong>From:</strong> Must be Pyth Entropy contract address</li>
                <li><strong>To:</strong> Our lottery contract address</li>
                <li><strong>Function:</strong> <code className="bg-background px-1 rounded">entropyCallback(uint64,bytes32)</code></li>
                <li><strong>Input Data:</strong> Contains the <code className="bg-background px-1 rounded">randomBytes</code> from Pyth</li>
              </ul>
            </div>

            <div>
              <strong className="text-foreground">Step 5: Check the Events</strong>
              <p className="mt-1">
                In the callback transaction, you'll see:
              </p>
              <ul className="list-disc list-inside ml-3 mt-1 space-y-1">
                <li><code className="bg-background px-1 rounded">WinnerDrawn</code> event with the selected winner</li>
                <li>This proves the random bytes were used to select the winner</li>
              </ul>
            </div>

            <div>
              <strong className="text-foreground">Step 6: Verify the Security Check</strong>
              <p className="mt-1">
                Check the contract code (verified on BaseScan). Look at <code className="bg-background px-1 rounded">entropyCallback()</code> function:
              </p>
              <pre className="bg-background p-2 rounded text-xs mt-1 overflow-x-auto">
{`require(msg.sender == address(pythIntegration.pyth()),
    "MegaYieldLottery: invalid callback caller");`}
              </pre>
              <p className="mt-1">
                This check ensures ONLY Pyth can call this function. If the transaction succeeded, 
                it means <code className="bg-background px-1 rounded">msg.sender</code> was verified to be the Pyth contract.
              </p>
            </div>

            <div className="pt-2 border-t border-border/50">
              <strong className="text-foreground">🔒 Security Guarantee:</strong>
              <p className="mt-1">
                The random number can <strong>ONLY</strong> come from Pyth because:
              </p>
              <ul className="list-disc list-inside ml-3 mt-1 space-y-1">
                <li>The callback verifies <code className="bg-background px-1 rounded">msg.sender == pythContract</code></li>
                <li>Only Pyth contract can call <code className="bg-background px-1 rounded">entropyCallback()</code></li>
                <li>All of this is verifiable on-chain on BaseScan</li>
              </ul>
            </div>

            <div className="pt-2 border-t border-border/50">
              <strong className="text-foreground">Quick Links:</strong>
              <div className="flex flex-wrap gap-2 mt-2">
                <a
                  href={`${explorerUrl}/address/${lotteryAddress}#internaltx`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs"
                >
                  Lottery Internal Txs
                </a>
                {pythContractAddress && (
                  <a
                    href={`${explorerUrl}/address/${pythContractAddress}#internaltx`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs"
                  >
                    Pyth Internal Txs
                  </a>
                )}
                <a
                  href={`${explorerUrl}/address/${lotteryAddress}#code`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-xs"
                >
                  View Contract Code
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

