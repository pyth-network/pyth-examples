"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, CheckCircle, Clock, Wallet, Settings, AlertTriangle, Activity, XCircle, Info, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { RPCInput } from "@/components/rpc-input"
import { InteractiveFlowDiagram } from "@/components/interactive-flow-diagram"
import { ThemeToggle } from "@/components/theme-toggle"
import { useEntropyBeasts } from "@/hooks/use-entropy-beasts"
import { useWalletClient, useAccount } from "wagmi"

type NFTSize = "small" | "big"

interface NFTConfig {
  size: NFTSize
  minGas: number
  description: string
}

const NFT_CONFIGS: Record<NFTSize, NFTConfig> = {
  small: {
    size: "small",
    minGas: 50000,
    description: "Simple NFT with basic metadata",
  },
  big: {
    size: "big",
    minGas: 550000,
    description: "Complex NFT with rich metadata and attributes",
  },
}

export default function PythentropyNFTDemo() {
  const [gasLimit, setGasLimit] = useState("50000")
  const [nftSize, setNftSize] = useState<NFTSize>("small")
  const [rpcUrl, setRpcUrl] = useState("https://base-sepolia.drpc.org")
  const { isConnected } = useAccount()

  // Real contract hook
  const { mint, isMinting, mintSequenceNumber, mintError, isListening, transactionHash, callbackCompleted, revealedEvent } = useEntropyBeasts(rpcUrl)

  const handleNFTSizeChange = (size: NFTSize) => {
    setNftSize(size)
    setGasLimit(NFT_CONFIGS[size].minGas.toString())
  }



  const isGasInsufficient = Number.parseInt(gasLimit) < NFT_CONFIGS[nftSize].minGas

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <ThemeToggle />
          </div>

          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Pyth Entropy v2 Demo</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            NFT Minting with Enhanced Callback Status Monitoring
          </p>

          {/* What You'll Learn Section */}
          <div className="max-w-4xl mx-auto mb-6">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-blue-900 dark:text-blue-100">🎓 What You'll Learn</CardTitle>
                <CardDescription className="text-blue-800 dark:text-blue-200 text-lg">
                  Understand the complete Pyth Entropy v2 flow from your contract to the provider and back
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">📚 Learning Objectives</h3>
                    <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                        How your contract requests entropy from Pyth Entropy v2
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                        How Entropy processes requests and sends to providers
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                        How callbacks return results and handle failures
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">🧪 Demo Steps</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="font-medium text-green-800 dark:text-green-200">Step 1: Success Scenario</div>
                        <div className="text-sm text-green-700 dark:text-green-300">Mint a small NFT with default gas to see successful callback</div>
                      </div>
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div className="font-medium text-orange-800 dark:text-orange-200">Step 2: Failure Scenario</div>
                        <div className="text-sm text-orange-700 dark:text-orange-300">Mint a big NFT with only 10 gas to see callback failure</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Base Sepolia Faucet Button */}
                <div className="pt-4 border-t border-blue-200 dark:border-blue-800">
                  <div className="text-center">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      💡 Need testnet ETH to try this demo?
                    </p>
                    <Button 
                      asChild
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <a 
                        href="https://faucet.quicknode.com/base/sepolia" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        🚰 Get Base Sepolia Testnet ETH
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                      QuickNode faucet provides 0.05 ETH every 12 hours
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contract Status */}
          <div className="max-w-2xl mx-auto mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Sequence Number:</span>
                <span className="ml-2 font-mono text-lg font-bold">{mintSequenceNumber}</span>
              </div>
              {mintSequenceNumber && (
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Last TX:</span>
                  <span className="ml-2 font-mono text-sm text-blue-600 dark:text-blue-400">
                    {transactionHash ? `${transactionHash.slice(0, 10)}...${transactionHash.slice(-8)}` : ""}
                  </span>
                </div>
              )}
            </div>
            {mintError && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                Error: {mintError}
              </div>
            )}
          </div>

          {/* Wallet Connection */}
          <div className="flex justify-center mb-6">
            <WalletConnectButton />
          </div>

          {/* RPC Configuration */}
          <RPCInput onRPCSet={setRpcUrl} isConnected={isConnected} />

          {/* Disclaimer */}
          <div className="max-w-2xl mx-auto mb-4">
            <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Demo Only:</strong> This is an educational example showcasing Pyth Entropy v2 features. No
                actual NFTs will be minted and no real transactions will be executed.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Added prominent interactive flow diagram at the top */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Interactive Pyth Entropy v2 Flow</CardTitle>
            <CardDescription>
              Watch the real-time flow as your NFT minting request moves through the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InteractiveFlowDiagram 
              mintingState={isMinting ? "processing" : "idle"}
              callbackStatus={callbackCompleted ? "success" : null}
              isRealMinting={isMinting}
              hasSequenceNumber={!!mintSequenceNumber}
              sequenceNumber={mintSequenceNumber}
              isListening={isListening}
              callbackCompleted={callbackCompleted}
              revealedEvent={revealedEvent}
              transactionHash={transactionHash}
            />
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Minting Interface */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                NFT Minting Interface
              </CardTitle>
              <CardDescription>Configure your NFT size and gas settings below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Guided Demo Buttons */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">🎯 Quick Demo Actions</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => {
                      setNftSize("small")
                      setGasLimit("50000")
                    }}
                    disabled={isMinting}
                    variant="outline"
                    className="text-sm h-auto py-3 px-4"
                  >
                    <div className="text-left">
                      <div className="font-medium">✅ Success Demo</div>
                      <div className="text-xs text-gray-500">Small NFT + 50k gas</div>
                    </div>
                  </Button>
                  <Button 
                    onClick={() => {
                      setNftSize("big")
                      setGasLimit("10")
                    }}
                    disabled={isMinting}
                    variant="outline"
                    className="text-sm h-auto py-3 px-4"
                  >
                    <div className="text-left">
                      <div className="font-medium">❌ Failure Demo</div>
                      <div className="text-xs text-gray-500">Big NFT + 10 gas</div>
                    </div>
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Click these buttons to quickly set up the recommended demo scenarios
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nft-size">NFT Size</Label>
                <Select value={nftSize} onValueChange={handleNFTSizeChange} disabled={isMinting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select NFT size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Small NFT</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Min gas: 50,000</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="big">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Big NFT</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Min gas: 150,000</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 dark:text-gray-400">{NFT_CONFIGS[nftSize].description}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gas-limit" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Custom Gas Limit
                </Label>
                <Input
                  id="gas-limit"
                  value={gasLimit}
                  onChange={(e) => setGasLimit(e.target.value)}
                  placeholder="50000"
                  disabled={isMinting}
                  className={isGasInsufficient ? "border-red-300 focus:border-red-500" : ""}
                />
                {isGasInsufficient && (
                  <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      Gas limit too low! Minimum required: {NFT_CONFIGS[nftSize].minGas.toLocaleString()}
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Demonstrates Entropy v2's enhanced callback status detection
                </p>
              </div>

              <div className="pt-4 space-y-3">
                {/* Real Contract Mint Button */}
                <Button 
                  onClick={() => mint(Number(gasLimit), nftSize === "big")} 
                  disabled={isMinting} 
                  className="w-full" 
                  size="lg"
                  variant="default"
                >
                  {isMinting ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Minting...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Mint Real NFT (Contract)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Event Display */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Event Details
              </CardTitle>
              <CardDescription>
                Returned event from Pyth Entropy v2 Contract - This shows the callback result
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {callbackCompleted ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Revealed Event Received</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Pyth Entropy v2 Revealed event successfully processed
                    </p>
                  </div>
                  
                  {/* Event Source Info */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                      <Info className="w-4 h-4" />
                      <span className="font-medium">Event Source</span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      This event comes from the Pyth Entropy v2 contract, not your NFT contract. It shows the callback execution result.
                    </p>
                  </div>
                  
                  {revealedEvent && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Provider Address</Label>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-sm break-all">
                          {revealedEvent.args.provider}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">The Fortuna provider that generated the entropy</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Caller Address</Label>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-sm break-all">
                          {revealedEvent.args.caller}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Your contract address that requested the entropy</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Sequence Number</Label>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-sm">
                          {revealedEvent.args.sequenceNumber?.toString()}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Unique identifier for this entropy request</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Random Number</Label>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-sm break-all">
                          {revealedEvent.args.randomNumber}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">The entropy value generated by the provider</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">User Contribution</Label>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-sm break-all">
                          {revealedEvent.args.userContribution}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Your contribution to the entropy generation</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Provider Contribution</Label>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-sm break-all">
                          {revealedEvent.args.providerContribution}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Provider's contribution to the entropy generation</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Callback Status</Label>
                        <div className={`p-2 rounded border font-mono text-sm ${
                          revealedEvent.args.callbackFailed 
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                        }`}>
                          {revealedEvent.args.callbackFailed ? 'Failed ❌' : 'Success ✅'}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {revealedEvent.args.callbackFailed 
                            ? 'Your contract callback failed (likely due to insufficient gas)'
                            : 'Your contract callback executed successfully'
                          }
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Callback Return Value</Label>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-sm break-all">
                          {revealedEvent.args.callbackReturnValue || '0x'}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Return value from your contract's callback function</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Callback Gas Used</Label>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-sm">
                          {revealedEvent.args.callbackGasUsed?.toString() || '0'}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Gas consumed by your contract's callback execution</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Extra Args</Label>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-sm break-all">
                          {revealedEvent.args.extraArgs || '0x'}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Additional arguments passed to your callback function</p>
                      </div>
                    </div>
                  )}
                  
                  {transactionHash && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Transaction Hash</Label>
                      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-sm break-all">
                        {transactionHash}
                      </div>
                    </div>
                  )}
                </div>
              ) : isListening ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span className="font-medium">Listening for Events</span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Waiting for Beast Minted event...
                  </p>
                </div>
              ) : isMinting ? (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <Zap className="w-4 h-4" />
                    <span className="font-medium">Minting in Progress</span>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Transaction being processed...
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Info className="w-4 h-4" />
                    <span className="font-medium">Ready to Mint</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Click "Mint Real NFT" to start the process
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Features Panel */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Pyth Entropy v2 Enhanced Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2 dark:text-white">Configurable Gas Limits</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Configurable Gas Limits for Callbacks
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-semibold mb-2 dark:text-white">Enhanced Callback Status</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Detailed failure detection including out-of-gas scenarios
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold mb-2 dark:text-white">Public Entropy Explorer</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Public Entropy Explorer for all Pyth Entropy requests at <a href="https://entropy-explorer.pyth.network/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">entropy-explorer.pyth.network</a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
