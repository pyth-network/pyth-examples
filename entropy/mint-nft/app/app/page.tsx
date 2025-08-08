"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Zap, CheckCircle, Clock, Wallet, Settings, AlertTriangle, Activity, XCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { ThemeToggle } from '@/components/theme-toggle'
import { useEntropyBeasts } from '@/hooks/use-entropy-beasts'
import { GAS_LIMITS, CONTRACTS } from '@/lib/contracts'
import { useAccount } from 'wagmi'

// Client-side only wrapper for ConnectButton
function ClientConnectButton() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
  }

  return <ConnectButton />
}

type MintingState = 'idle' | 'sending' | 'processing' | 'listening' | 'callback' | 'completed' | 'failed'
type CallbackStatus = 'success' | 'out_of_gas' | 'execution_reverted' | 'invalid_request' | null
type NFTSize = 'small' | 'big'

interface NFTConfig {
  size: NFTSize
  minGas: number
}

const NFT_CONFIGS: Record<NFTSize, NFTConfig> = {
  small: {
    size: 'small',
    minGas: GAS_LIMITS.small,
  },
  big: {
    size: 'big',
    minGas: GAS_LIMITS.big,
  }
}

// Client-only wrapper to prevent SSR issues
function ClientOnlyDemo() {
  const [mintingState, setMintingState] = useState<MintingState>('idle')
  const [callbackStatus, setCallbackStatus] = useState<CallbackStatus>(null)
  const [gasLimit, setGasLimit] = useState('50000')
  const [nftSize, setNftSize] = useState<NFTSize>('small')
  const [transactionHash, setTransactionHash] = useState('')
  const [eventLogs, setEventLogs] = useState<string[]>([])
  const [failureReason, setFailureReason] = useState('')
  
  // Contract integration
  const {
    totalSupply,
    mintedBeasts,
    isListening,
    isMinting,
    isConfirming,
    isConfirmed,
    mintError,
    mint,
    resetMintedBeasts,
  } = useEntropyBeasts()

  // Get connection status
  const { isConnected } = useAccount()

  const addEventLog = (message: string) => {
    setEventLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Handle contract state changes
  useEffect(() => {
    if (isMinting) {
      setMintingState('sending')
    } else if (isConfirming) {
      setMintingState('processing')
    } else if (isListening) {
      setMintingState('listening')
    } else if (mintError) {
      setMintingState('failed')
      setFailureReason(mintError.message)
      addEventLog(`❌ Transaction failed: ${mintError.message}`)
    }
  }, [isMinting, isConfirming, isListening, mintError])

  // Handle successful mint
  useEffect(() => {
    if (mintedBeasts.length > 0) {
      const latestBeast = mintedBeasts[mintedBeasts.length - 1]
      setMintingState('completed')
      setTransactionHash(`Beast #${latestBeast.tokenId}`)
      addEventLog('📨 Callback event received')
      addEventLog('✅ Callback status: SUCCESS')
      addEventLog(`🎉 Beast NFT minted! Strength: ${latestBeast.strength}, Intelligence: ${latestBeast.intelligence}`)
      addEventLog(`⛽ Gas used: ${latestBeast.gasUsed}`)
    }
  }, [mintedBeasts])

  const handleNFTSizeChange = (size: NFTSize) => {
    setNftSize(size)
    setGasLimit(NFT_CONFIGS[size].minGas.toString())
  }

  const simulateCallbackFailure = () => {
    const currentGas = parseInt(gasLimit)
    const minRequired = NFT_CONFIGS[nftSize].minGas
    
    if (currentGas < minRequired) {
      return 'out_of_gas'
    }
    
    // Simulate other potential failures
    const random = Math.random()
    if (random < 0.1) return 'execution_reverted'
    if (random < 0.05) return 'invalid_request'
    
    return 'success'
  }

  const handleMint = async () => {
    try {
      setMintingState('sending')
      setEventLogs([])
      setCallbackStatus(null)
      setFailureReason('')
      
      addEventLog('🚀 Mint request initiated')
      
      // Call the real contract
      await mint(nftSize === 'big', parseInt(gasLimit))
      
      setMintingState('processing')
      addEventLog('📡 Request sent to Pyth Entropy Provider')
      addEventLog('⛓️ Transaction submitted to blockchain')
      
      setMintingState('listening')
      addEventLog('👂 Listening for callback events...')
      
      // The rest will be handled by the event listener in the hook
    } catch (error) {
      console.error('Mint error:', error)
      setMintingState('failed')
      setFailureReason(error instanceof Error ? error.message : 'Unknown error')
      addEventLog(`❌ Mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const resetDemo = () => {
    setMintingState('idle')
    setCallbackStatus(null)
    setTransactionHash('')
    setEventLogs([])
    setFailureReason('')
    resetMintedBeasts()
  }

  const getStateInfo = (state: MintingState) => {
    switch (state) {
      case 'idle':
        return { title: 'Ready to Mint', description: 'Configure your NFT and gas settings', color: 'bg-gray-100 dark:bg-gray-800' }
      case 'sending':
        return { title: 'Sending Request', description: 'Transmitting to Pyth Entropy Provider', color: 'bg-blue-100 dark:bg-blue-900' }
      case 'processing':
        return { title: 'Processing', description: 'Entropy Provider handling request', color: 'bg-yellow-100 dark:bg-yellow-900' }
      case 'listening':
        return { title: 'Listening for Events', description: 'Monitoring blockchain for callback', color: 'bg-purple-100 dark:bg-purple-900' }
      case 'callback':
        return { title: 'Callback Received', description: 'Processing callback status', color: 'bg-orange-100 dark:bg-orange-900' }
      case 'completed':
        return { title: 'Minting Complete', description: 'NFT successfully minted!', color: 'bg-green-100 dark:bg-green-900' }
      case 'failed':
        return { title: 'Minting Failed', description: 'Callback failed - see details below', color: 'bg-red-100 dark:bg-red-900' }
      default:
        return { title: 'Error', description: 'Something went wrong', color: 'bg-red-100 dark:bg-red-900' }
    }
  }

  const isGasInsufficient = parseInt(gasLimit) < NFT_CONFIGS[nftSize].minGas

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 relative">
          {/* Theme Toggle - Top Right */}
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            EntropyBeasts NFT Minting
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            Mint unique beasts with random stats using Pyth Entropy v2
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Total Beasts Minted: {totalSupply} | Contract: {CONTRACTS.ENTROPY_BEASTS.slice(0, 6)}...{CONTRACTS.ENTROPY_BEASTS.slice(-4)}
          </div>
          
          {/* Wallet Connection */}
          <div className="flex justify-center mb-6">
            <ClientConnectButton />
          </div>
          
          {/* Disclaimer */}
          <div className="max-w-2xl mx-auto mb-4">
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Live Contract:</strong> This app connects to a real EntropyBeasts contract on Base. 
                Minting will create actual NFTs with random stats using Pyth Entropy v2.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Minting Interface */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Beast Minting Interface
              </CardTitle>
              <CardDescription>
                Configure your beast size and gas settings below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nft-size">Beast Size</Label>
                <Select 
                  value={nftSize} 
                  onValueChange={handleNFTSizeChange}
                  disabled={mintingState !== 'idle'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select NFT size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Small Beast</span>
                        <span className="text-xs text-gray-500">Min gas: {GAS_LIMITS.small.toLocaleString()}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="big">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Big Beast</span>
                        <span className="text-xs text-gray-500">Min gas: {GAS_LIMITS.big.toLocaleString()}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  {nftSize === 'big' ? 'Complex beast with extra processing' : 'Simple beast with basic stats'}
                </p>
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
                  disabled={mintingState !== 'idle'}
                  className={isGasInsufficient ? 'border-red-300 focus:border-red-500' : ''}
                />
                {isGasInsufficient && (
                  <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-700 dark:text-red-200">
                      Gas limit too low! Minimum required: {NFT_CONFIGS[nftSize].minGas.toLocaleString()}
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-gray-500">
                  Demonstrates Entropy v2's enhanced callback status detection
                </p>
              </div>

              <div className="pt-4">
                {mintingState === 'idle' ? (
                  <Button 
                    onClick={handleMint} 
                    className="w-full" 
                    size="lg"
                    disabled={!isConnected}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Mint Beast
                  </Button>
                ) : mintingState === 'completed' ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800 rounded-lg">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Transaction Hash: {transactionHash}
                      </p>
                    </div>
                    <Button onClick={resetDemo} variant="outline" className="w-full">
                      Try Another Mint
                    </Button>
                  </div>
                ) : mintingState === 'failed' ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800 rounded-lg">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                        Callback Failed: {callbackStatus?.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-300">
                        {failureReason}
                      </p>
                    </div>
                    <Button onClick={resetDemo} variant="outline" className="w-full">
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <Button disabled className="w-full" size="lg">
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    {getStateInfo(mintingState).title}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - Flow Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Pyth Entropy v2 Flow</CardTitle>
              <CardDescription>
                Watch the enhanced callback status monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Current State Display */}
                <div className={`p-4 rounded-lg ${getStateInfo(mintingState).color}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{getStateInfo(mintingState).title}</h3>
                      <p className="text-sm text-gray-600">{getStateInfo(mintingState).description}</p>
                    </div>
                    <Badge variant="secondary">
                      {mintingState.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Callback Status Display */}
                {callbackStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg border ${
                      callbackStatus === 'success' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {callbackStatus === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                      <span className={`font-medium ${
                        callbackStatus === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                      }`}>
                        Callback Status: {callbackStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Flow Steps */}
                <div className="space-y-4">
                  {/* Step 1: User Request */}
                  <div className="flex items-center space-x-4">
                    <motion.div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        ['sending', 'processing', 'listening', 'callback', 'completed', 'failed'].includes(mintingState)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                      animate={mintingState === 'sending' ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.5, repeat: mintingState === 'sending' ? Infinity : 0 }}
                    >
                      <Wallet className="w-6 h-6" />
                    </motion.div>
                    <div className="flex-1">
                      <h4 className="font-medium">User Request</h4>
                      <p className="text-sm text-gray-600">
                        {nftSize.charAt(0).toUpperCase() + nftSize.slice(1)} NFT, Gas: {gasLimit}
                      </p>
                    </div>
                  </div>

                  {/* Animated Arrow */}
                  <div className="flex justify-center">
                    <motion.div
                      animate={
                        mintingState === 'sending'
                          ? { x: [0, 20, 0], opacity: [0.5, 1, 0.5] }
                          : {}
                      }
                      transition={{ duration: 1, repeat: mintingState === 'sending' ? Infinity : 0 }}
                    >
                      <ArrowRight className={`w-6 h-6 ${
                        ['processing', 'listening', 'callback', 'completed', 'failed'].includes(mintingState)
                          ? 'text-blue-500'
                          : 'text-gray-400'
                      }`} />
                    </motion.div>
                  </div>

                  {/* Step 2: Entropy Provider */}
                  <div className="flex items-center space-x-4">
                    <motion.div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        ['processing', 'listening', 'callback', 'completed', 'failed'].includes(mintingState)
                          ? 'bg-yellow-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                      animate={mintingState === 'processing' ? { rotate: 360 } : {}}
                      transition={{ duration: 2, repeat: mintingState === 'processing' ? Infinity : 0 }}
                    >
                      <Zap className="w-6 h-6" />
                    </motion.div>
                    <div className="flex-1">
                      <h4 className="font-medium">Pyth Entropy Provider</h4>
                      <p className="text-sm text-gray-600">Processing with gas validation</p>
                    </div>
                  </div>

                  {/* Animated Arrow */}
                  <div className="flex justify-center">
                    <motion.div
                      animate={
                        mintingState === 'processing'
                          ? { x: [0, 20, 0], opacity: [0.5, 1, 0.5] }
                          : {}
                      }
                      transition={{ duration: 1, repeat: mintingState === 'processing' ? Infinity : 0 }}
                    >
                      <ArrowRight className={`w-6 h-6 ${
                        ['listening', 'callback', 'completed', 'failed'].includes(mintingState)
                          ? 'text-yellow-500'
                          : 'text-gray-400'
                      }`} />
                    </motion.div>
                  </div>

                  {/* Step 3: Blockchain */}
                  <div className="flex items-center space-x-4">
                    <motion.div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        ['listening', 'callback', 'completed', 'failed'].includes(mintingState)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                      animate={mintingState === 'listening' ? { opacity: [0.5, 1, 0.5] } : {}}
                      transition={{ duration: 1.5, repeat: mintingState === 'listening' ? Infinity : 0 }}
                    >
                      <div className="w-6 h-6 border-2 border-current rounded-sm" />
                    </motion.div>
                    <div className="flex-1">
                      <h4 className="font-medium">Blockchain Execution</h4>
                      <p className="text-sm text-gray-600">Smart contract processing</p>
                    </div>
                  </div>

                  {/* Animated Arrow */}
                  <div className="flex justify-center">
                    <motion.div
                      animate={
                        mintingState === 'callback'
                          ? { x: [0, -20, 0], opacity: [0.5, 1, 0.5] }
                          : {}
                      }
                      transition={{ duration: 1, repeat: mintingState === 'callback' ? Infinity : 0 }}
                    >
                      <ArrowRight className={`w-6 h-6 rotate-180 ${
                        ['callback', 'completed', 'failed'].includes(mintingState)
                          ? callbackStatus === 'success' ? 'text-green-500' : 'text-red-500'
                          : 'text-gray-400'
                      }`} />
                    </motion.div>
                  </div>

                  {/* Step 4: Enhanced Callback */}
                  <div className="flex items-center space-x-4">
                    <motion.div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        ['callback', 'completed', 'failed'].includes(mintingState)
                          ? callbackStatus === 'success' 
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                      animate={mintingState === 'callback' ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.6, repeat: mintingState === 'callback' ? 3 : 0 }}
                    >
                      {callbackStatus === 'success' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : callbackStatus ? (
                        <XCircle className="w-6 h-6" />
                      ) : (
                        <Activity className="w-6 h-6" />
                      )}
                    </motion.div>
                    <div className="flex-1">
                      <h4 className="font-medium">Enhanced Callback</h4>
                      <p className="text-sm text-gray-600">
                        {callbackStatus ? 
                          `Status: ${callbackStatus.replace('_', ' ')}` : 
                          'Detailed status monitoring'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Event Logs */}
                {eventLogs.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Event Logs
                    </h4>
                    <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono max-h-40 overflow-y-auto">
                      {eventLogs.map((log, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="mb-1"
                        >
                          {log}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success/Failure Animation */}
                <AnimatePresence>
                  {mintingState === 'completed' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-4 bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800 rounded-lg text-center"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1 }}
                        className="inline-block mb-2"
                      >
                        <CheckCircle className="w-8 h-8 text-green-500 dark:text-green-400" />
                      </motion.div>
                      <h3 className="font-semibold text-green-800 dark:text-green-200">Success!</h3>
                      <p className="text-sm text-green-600 dark:text-green-300">
                        Your {nftSize} Beast NFT has been minted successfully
                      </p>
                    </motion.div>
                  )}
                  
                  {mintingState === 'failed' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-4 bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800 rounded-lg text-center"
                    >
                      <motion.div
                        animate={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                        className="inline-block mb-2"
                      >
                        <XCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
                      </motion.div>
                      <h3 className="font-semibold text-red-800 dark:text-red-200">Callback Failed!</h3>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        Entropy v2 detected: {callbackStatus?.replace('_', ' ')}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Smart Gas Management</h3>
                <p className="text-sm text-gray-600">
                  Automatic gas estimation with size-based requirements
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold mb-2">Enhanced Callback Status</h3>
                <p className="text-sm text-gray-600">
                  Detailed failure detection including out-of-gas scenarios
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Real-time Event Monitoring</h3>
                <p className="text-sm text-gray-600">
                  Live event logs showing the complete transaction lifecycle
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Notes */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use This Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3 text-gray-900">Getting Started</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    Connect your wallet using the button above (optional for demo)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    Choose between Small or Big NFT to see different gas requirements
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    Adjust gas limit to trigger different callback scenarios
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    Watch the flow visualization and event logs in real-time
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3 text-gray-900">What You'll Learn</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                    How Pyth Entropy v2 handles custom gas limits
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                    Enhanced callback status detection and error handling
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                    Real-time event monitoring and transaction lifecycle
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                    Out-of-gas detection and failure reason analysis
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">💡 Pro Tip</h4>
              <p className="text-sm text-gray-600">
                Try setting the gas limit below the minimum requirement for your selected NFT size to see 
                how Entropy v2 detects and reports out-of-gas failures in the callback status.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PythEntropyNFTDemo() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Pyth Entropy NFT Demo...</p>
        </div>
      </div>
    )
  }

  return <ClientOnlyDemo />
}
