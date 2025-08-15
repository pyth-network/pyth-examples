"use client"

import { motion } from "framer-motion"
import { ArrowRight, ExternalLink } from "lucide-react"

type MintingState = "idle" | "sending" | "processing" | "listening" | "callback" | "completed" | "failed"
type CallbackStatus = "success" | "out_of_gas" | "execution_reverted" | "invalid_request" | null

interface InteractiveFlowDiagramProps {
  mintingState: MintingState
  callbackStatus: CallbackStatus
  isRealMinting?: boolean
  hasSequenceNumber?: boolean
  sequenceNumber?: string | null
  isListening?: boolean
  callbackCompleted?: boolean
  revealedEvent?: any
  transactionHash?: string | null
}

export function InteractiveFlowDiagram({ 
  mintingState, 
  callbackStatus, 
  isRealMinting = false,
  hasSequenceNumber = false,
  sequenceNumber = null,
  isListening = false,
  callbackCompleted = false,
  revealedEvent = null,
  transactionHash = null
}: InteractiveFlowDiagramProps) {
  const getBoxState = (step: "entropy-beasts" | "pyth-entropy" | "provider") => {
    // Handle real contract minting flow
    if (isRealMinting || hasSequenceNumber) {
      switch (step) {
        case "entropy-beasts":
          // Only active during minting, not after sequence number is received
          if (isRealMinting && !hasSequenceNumber) return "active"
          return "inactive"
        
        case "pyth-entropy":
          // Only active when we have sequence number but not listening yet
          // Once listening starts, execute is complete, so box should be neutral
          if (hasSequenceNumber && !isListening) return "active"
          return "inactive"
        
        case "provider":
          // Only active when we have sequence number but not listening yet
          // Once listening starts, provider processing is complete, so box should be neutral
          if (hasSequenceNumber && !isListening) return "active"
          // Remove the processing state during listening - should be neutral
          return "inactive"
        
        default:
          return "inactive"
      }
    }
    
    // Handle demo/mock minting flow
    switch (step) {
      case "entropy-beasts":
        if (["idle"].includes(mintingState)) return "inactive"
        if (["sending"].includes(mintingState)) return "active"
        if (["callback", "completed", "failed"].includes(mintingState)) return "callback"
        return "processing"

      case "pyth-entropy":
        if (["idle", "sending"].includes(mintingState)) return "inactive"
        if (["processing"].includes(mintingState)) return "active"
        return "processing"

      case "provider":
        if (["idle", "sending", "processing"].includes(mintingState)) return "inactive"
        if (["listening"].includes(mintingState)) return "active"
        return "processing"

      default:
        return "inactive"
    }
  }

  const getBoxColor = (state: string) => {
    switch (state) {
      case "inactive":
        return "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
      case "active":
        return "bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-800 dark:text-blue-200"
      case "processing":
        return "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-500 text-green-800 dark:text-green-200"
      case "callback":
        return callbackStatus === "success"
          ? "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-500 text-green-800 dark:text-green-200"
          : "bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-500 text-red-800 dark:text-red-200"
      default:
        return "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
    }
  }

  const isArrowActive = (arrow: "forward1" | "forward2" | "callback") => {
    // Handle real contract minting flow
    if (isRealMinting || hasSequenceNumber) {
      switch (arrow) {
        case "forward1":
          // Request arrow: only active during minting, not after sequence number is received
          return isRealMinting && !hasSequenceNumber
        case "forward2":
          // Execute arrow: only active when we have sequence number but not listening yet
          // Once listening starts, execute is complete, so arrow should be neutral
          return hasSequenceNumber && !isListening
        case "callback":
          // Only show callback arrow if we have a sequence number, callback is completed, AND callback didn't fail
          return hasSequenceNumber && callbackCompleted && revealedEvent && !revealedEvent.args.callbackFailed
        default:
          return false
      }
    }
    
    // Handle demo/mock minting flow
    switch (arrow) {
      case "forward1":
        return ["sending", "processing", "listening", "callback", "completed", "failed"].includes(mintingState)
      case "forward2":
        return ["processing", "listening", "callback", "completed", "failed"].includes(mintingState)
      case "callback":
        return ["callback", "completed", "failed"].includes(mintingState)
      default:
        return false
    }
  }

  const getStatusText = () => {
    if (isRealMinting || hasSequenceNumber) {
      if (callbackCompleted) {
        if (revealedEvent && revealedEvent.args.callbackFailed) {
          return "❌ Callback Failed"
        } else {
          return "✅ Callback Completed Successfully!"
        }
      }
      if (hasSequenceNumber && !isListening) {
        return "✅ Success"
      }
      if (hasSequenceNumber && isListening) {
        return "👂 Listening for Beast Minted Event..."
      }
      return "🚀 Minting in Progress..."
    }
    
    // Demo states
    switch (mintingState) {
      case "idle":
        return "Ready to Start"
      case "sending":
        return "Sending Request..."
      case "processing":
        return "Processing with Entropy..."
      case "listening":
        return "Executing on Blockchain..."
      case "callback":
        return "Receiving Callback..."
      case "completed":
        return `✅ Success - ${callbackStatus}`
      case "failed":
        return `❌ Failed - ${callbackStatus?.replace("_", " ")}`
      default:
        return "Ready to Start"
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="relative">
        {/* Top Row - Forward Flow */}
        <div className="flex items-center justify-between mb-0">
          {/* Entropy Beasts */}
          <motion.div
            className={`relative w-40 h-24 rounded-xl border-2 flex items-center justify-center font-semibold text-sm ${getBoxColor(getBoxState("entropy-beasts"))}`}
            animate={getBoxState("entropy-beasts") === "active" ? { scale: [1, 1.02, 1] } : {}}
            transition={{
              duration: 3,
              repeat: getBoxState("entropy-beasts") === "active" ? Number.POSITIVE_INFINITY : 0,
            }}
            title="Your NFT contract that requests entropy from Pyth Entropy v2"
          >
            <div className="text-center">
              <div className="font-bold">Entropy Beasts</div>
              <div className="text-xs opacity-75">NFT Contract</div>
            </div>
            {getBoxState("entropy-beasts") === "active" && (
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              />
            )}
          </motion.div>

          {/* Forward Arrow 1 */}
          <motion.div
            className="flex items-center"
            animate={isArrowActive("forward1") ? { x: [0, 5, 0] } : {}}
            transition={{ duration: 2, repeat: isArrowActive("forward1") ? Number.POSITIVE_INFINITY : 0 }}
            title="Your contract sends a request to Pyth Entropy v2 for entropy"
          >
            <ArrowRight
              className={`w-8 h-8 ${isArrowActive("forward1") ? "text-blue-500" : "text-gray-300 dark:text-gray-600"}`}
            />
            <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">request</div>
          </motion.div>

          {/* Pyth Entropy */}
          <motion.div
            className={`relative w-40 h-24 rounded-xl border-2 flex items-center justify-center font-semibold text-sm ${getBoxColor(getBoxState("pyth-entropy"))}`}
            animate={getBoxState("pyth-entropy") === "active" ? { scale: [1, 1.02, 1] } : {}}
            transition={{
              duration: 3,
              repeat: getBoxState("pyth-entropy") === "active" ? Number.POSITIVE_INFINITY : 0,
            }}
            title="Pyth Entropy v2 processes your request and sends it to a provider"
          >
            <div className="text-center">
              <div className="font-bold">Pyth Entropy V2</div>
            </div>
            {getBoxState("pyth-entropy") === "active" && (
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              />
            )}
          </motion.div>

          {/* Forward Arrow 2 */}
          <motion.div
            className="flex items-center"
            animate={isArrowActive("forward2") ? { x: [0, 5, 0] } : {}}
            transition={{ duration: 2, repeat: isArrowActive("forward2") ? Number.POSITIVE_INFINITY : 0 }}
            title="Pyth Entropy v2 executes the request by sending it to a provider"
          >
            <ArrowRight
              className={`w-8 h-8 ${isArrowActive("forward2") ? "text-yellow-500" : "text-gray-300 dark:text-gray-600"}`}
            />
            <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">execute</div>
          </motion.div>

          {/* Provider */}
          <motion.div
            className={`relative w-40 h-24 rounded-xl border-2 flex items-center justify-center font-semibold text-sm ${getBoxColor(getBoxState("provider"))}`}
            animate={getBoxState("provider") === "active" ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 3, repeat: getBoxState("provider") === "active" ? Number.POSITIVE_INFINITY : 0 }}
            title="Fortuna provider generates entropy and sends it back through the callback"
          >
            <div className="text-center">
              <div className="font-bold">Provider </div>
              <div className="text-xs opacity-75">Fortuna</div>
            </div>
            {getBoxState("provider") === "active" && (
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              />
            )}
          </motion.div>
        </div>

        {/* Callback Arrow - Bottom */}
        <div className="flex justify-center">
          <motion.div
            className="relative"
            animate={isArrowActive("callback") ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 3, repeat: isArrowActive("callback") ? Number.POSITIVE_INFINITY : 0 }}
            title="The provider sends entropy back to your contract through a callback function. This is where you can see if your callback succeeded or failed."
          >
            {/* Updated SVG with marker arrowhead and responsive half-square path */}
            <svg
              viewBox="0 0 1000 180"
              className={`w-full h-40 md:h-48 ${
                isArrowActive("callback")
                  ? hasSequenceNumber || callbackStatus === "success"
                    ? "text-green-500"
                    : "text-red-500"
                  : "text-gray-300 dark:text-gray-600"
              }`}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Callback path from Provider to Entropy Beasts"
            >
              <defs>
                <marker
                  id="cb-arrow"
                  markerWidth="14"
                  markerHeight="14"
                  refX="10"
                  refY="7"
                  orient="auto"
                >
                  <path d="M 0 0 L 14 7 L 0 14 z" fill="currentColor" />
                </marker>
              </defs>

              {/* Half-square path: start at Provider (right), go down, left, up to Entropy Beasts (left) */}
              <path
                d="M 920 60 V 150 H 140 V 60"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd="url(#cb-arrow)"
                className="transition-all duration-300"
              />

              {/* Animated pulse dot moving along the callback route */}
              {isArrowActive("callback") && (
                <circle r="5" fill="currentColor">
                  <animateMotion dur="2s" repeatCount="indefinite" path="M 920 60 V 150 H 140 V 60" />
                </circle>
              )}
            </svg>
            
            {/* Label */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">
              entropyCallback
            </div>
          </motion.div>
        </div>

        {/* Transaction Explorer Link */}
        {callbackCompleted && revealedEvent && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                Check your transaction in{" "}
                <a
                  href={`https://entropy-explorer.pyth.network/?chain=base-sepolia-testnet&search=${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                >
                  Entropy Explorer
                </a>
              </span>
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="mt-8 text-center">
          <motion.div
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              isRealMinting
                ? hasSequenceNumber
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                : mintingState === "idle"
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                  : mintingState === "completed"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                    : mintingState === "failed"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
            }`}
            animate={
              (isRealMinting || ["sending", "processing", "listening", "callback"].includes(mintingState)) 
                ? { scale: [1, 1.05, 1] } 
                : {}
            }
            transition={{
              duration: 2,
              repeat: (isRealMinting || ["sending", "processing", "listening", "callback"].includes(mintingState))
                ? Number.POSITIVE_INFINITY
                : 0,
            }}
          >
            {getStatusText()}
          </motion.div>
        </div>

        {/* Enhanced Status Details */}
        {(callbackStatus || hasSequenceNumber) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center">
                         {hasSequenceNumber && (
               <div className="mb-2 inline-block px-3 py-1 rounded text-xs font-mono bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                 Sequence Number: {sequenceNumber}
               </div>
             )}
            {callbackStatus && (
              <div
                className={`inline-block px-3 py-1 rounded text-xs font-mono ${
                  callbackStatus === "success"
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-green-800"
                }`}
              >
                Callback Status: {callbackStatus.toUpperCase()}
              </div>
            )}
          </motion.div>
        )}

        {/* Educational Flow Explanation */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-center">🔍 Understanding the Pyth Entropy Flow</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="space-y-2">
              <div className="font-medium text-gray-800 dark:text-gray-200">📤 Request Phase:</div>
              <p>Entropy Beasts contract requests random number from Pyth Entropy v2. The requests creates a sequence number for tracking.</p>
              
              <div className="font-medium text-gray-800 dark:text-gray-200">⚡ Execute Phase:</div>
              <p>Pyth Entropy v2 processes your request and sends it to the Fortuna provider for random number generation.</p>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-gray-800 dark:text-gray-200">🔄 Callback Phase:</div>
              <p>The provider generates random number and sends it back to your contract through a callback function.</p>
              
              <div className="font-medium text-gray-800 dark:text-gray-200">📊 Monitoring:</div>
              <p>Watch the Event Details panel to see the callback result and understand success/failure scenarios.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
