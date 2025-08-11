"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

type MintingState = "idle" | "sending" | "processing" | "listening" | "callback" | "completed" | "failed"
type CallbackStatus = "success" | "out_of_gas" | "execution_reverted" | "invalid_request" | null

interface InteractiveFlowDiagramProps {
  mintingState: MintingState
  callbackStatus: CallbackStatus
}

export function InteractiveFlowDiagram({ mintingState, callbackStatus }: InteractiveFlowDiagramProps) {
  const getBoxState = (step: "entropy-beasts" | "pyth-entropy" | "provider") => {
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

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="relative">
        {/* Top Row - Forward Flow */}
        <div className="flex items-center justify-between mb-16">
          {/* Entropy Beasts */}
          <motion.div
            className={`relative w-40 h-24 rounded-xl border-2 flex items-center justify-center font-semibold text-sm ${getBoxColor(getBoxState("entropy-beasts"))}`}
            animate={getBoxState("entropy-beasts") === "active" ? { scale: [1, 1.05, 1] } : {}}
            transition={{
              duration: 1,
              repeat: getBoxState("entropy-beasts") === "active" ? Number.POSITIVE_INFINITY : 0,
            }}
          >
            <div className="text-center">
              <div className="font-bold">Entropy Beasts</div>
              <div className="text-xs opacity-75">NFT Contract</div>
            </div>
            {getBoxState("entropy-beasts") === "active" && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
              />
            )}
          </motion.div>

          {/* Forward Arrow 1 */}
          <motion.div
            className="flex items-center"
            animate={isArrowActive("forward1") && mintingState === "sending" ? { x: [0, 10, 0] } : {}}
            transition={{ duration: 1, repeat: mintingState === "sending" ? Number.POSITIVE_INFINITY : 0 }}
          >
            <ArrowRight
              className={`w-8 h-8 ${isArrowActive("forward1") ? "text-blue-500" : "text-gray-300 dark:text-gray-600"}`}
            />
            <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">request</div>
          </motion.div>

          {/* Pyth Entropy */}
          <motion.div
            className={`relative w-40 h-24 rounded-xl border-2 flex items-center justify-center font-semibold text-sm ${getBoxColor(getBoxState("pyth-entropy"))}`}
            animate={getBoxState("pyth-entropy") === "active" ? { rotate: [0, 2, -2, 0] } : {}}
            transition={{
              duration: 2,
              repeat: getBoxState("pyth-entropy") === "active" ? Number.POSITIVE_INFINITY : 0,
            }}
          >
            <div className="text-center">
              <div className="font-bold">Pyth Entropy</div>
              <div className="text-xs opacity-75">v2 Provider</div>
            </div>
            {getBoxState("pyth-entropy") === "active" && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
              />
            )}
          </motion.div>

          {/* Forward Arrow 2 */}
          <motion.div
            className="flex items-center"
            animate={isArrowActive("forward2") && mintingState === "processing" ? { x: [0, 10, 0] } : {}}
            transition={{ duration: 1, repeat: mintingState === "processing" ? Number.POSITIVE_INFINITY : 0 }}
          >
            <ArrowRight
              className={`w-8 h-8 ${isArrowActive("forward2") ? "text-yellow-500" : "text-gray-300 dark:text-gray-600"}`}
            />
            <div className="ml-2 text-xs text-gray-500 dark:text-gray-400">execute</div>
          </motion.div>

          {/* Provider */}
          <motion.div
            className={`relative w-40 h-24 rounded-xl border-2 flex items-center justify-center font-semibold text-sm ${getBoxColor(getBoxState("provider"))}`}
            animate={getBoxState("provider") === "active" ? { opacity: [0.7, 1, 0.7] } : {}}
            transition={{ duration: 1.5, repeat: getBoxState("provider") === "active" ? Number.POSITIVE_INFINITY : 0 }}
          >
            <div className="text-center">
              <div className="font-bold">Provider</div>
              <div className="text-xs opacity-75">Blockchain</div>
            </div>
            {getBoxState("provider") === "active" && (
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
              />
            )}
          </motion.div>
        </div>

        {/* Callback Arrow - Bottom */}
        <div className="flex justify-center">
          <motion.div
            className="flex items-center"
            animate={isArrowActive("callback") && mintingState === "callback" ? { x: [0, -10, 0] } : {}}
            transition={{ duration: 1, repeat: mintingState === "callback" ? Number.POSITIVE_INFINITY : 0 }}
          >
            <div className="mr-2 text-xs text-gray-500 dark:text-gray-400">entropyCallback</div>
            <motion.div
              animate={isArrowActive("callback") ? { rotate: 180 } : { rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowRight
                className={`w-8 h-8 ${
                  isArrowActive("callback")
                    ? callbackStatus === "success"
                      ? "text-green-500"
                      : "text-red-500"
                    : "text-gray-300 dark:text-gray-600"
                }`}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Status Indicator */}
        <div className="mt-8 text-center">
          <motion.div
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              mintingState === "idle"
                ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                : mintingState === "completed"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                  : mintingState === "failed"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
            }`}
            animate={
              ["sending", "processing", "listening", "callback"].includes(mintingState) ? { scale: [1, 1.05, 1] } : {}
            }
            transition={{
              duration: 2,
              repeat: ["sending", "processing", "listening", "callback"].includes(mintingState)
                ? Number.POSITIVE_INFINITY
                : 0,
            }}
          >
            {mintingState === "idle" && "Ready to Start"}
            {mintingState === "sending" && "Sending Request..."}
            {mintingState === "processing" && "Processing with Entropy..."}
            {mintingState === "listening" && "Executing on Blockchain..."}
            {mintingState === "callback" && "Receiving Callback..."}
            {mintingState === "completed" && `✅ Success - ${callbackStatus}`}
            {mintingState === "failed" && `❌ Failed - ${callbackStatus?.replace("_", " ")}`}
          </motion.div>
        </div>

        {/* Enhanced Status Details */}
        {callbackStatus && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center">
            <div
              className={`inline-block px-3 py-1 rounded text-xs font-mono ${
                callbackStatus === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              }`}
            >
              Callback Status: {callbackStatus.toUpperCase()}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
