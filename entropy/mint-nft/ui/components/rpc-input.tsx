"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, Info, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface RPCInputProps {
  onRPCSet: (rpcUrl: string) => void
  isConnected: boolean
}

export function RPCInput({ onRPCSet, isConnected }: RPCInputProps) {
  const [rpcUrl, setRpcUrl] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasCustomRPC, setHasCustomRPC] = useState(false)

  useEffect(() => {
    // Check if user has already set a custom RPC
    const savedRPC = localStorage.getItem("custom_rpc_url")
    if (savedRPC) {
      setRpcUrl(savedRPC)
      setHasCustomRPC(true)
      onRPCSet(savedRPC)
    }
  }, [onRPCSet])

  const handleSetRPC = () => {
    if (rpcUrl.trim()) {
      localStorage.setItem("custom_rpc_url", rpcUrl.trim())
      setHasCustomRPC(true)
      onRPCSet(rpcUrl.trim())
      setIsExpanded(false)
    }
  }

  const handleUsePublicRPC = () => {
    localStorage.removeItem("custom_rpc_url")
    setHasCustomRPC(false)
    const publicRPC = "https://base-sepolia.drpc.org"
    setRpcUrl(publicRPC)
    onRPCSet(publicRPC)
    setIsExpanded(false)
  }

  if (!isConnected) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="max-w-md mx-auto mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5" />
              RPC Configuration
            </CardTitle>
            <CardDescription>
              {hasCustomRPC ? "Using private RPC for optimal performance" : "Configure your RPC endpoint"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasCustomRPC ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">Private RPC Active</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Using: {rpcUrl.slice(0, 30)}...
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setIsExpanded(true)} 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                  >
                    Change RPC
                  </Button>
                  <Button 
                    onClick={handleUsePublicRPC} 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                  >
                    Use Public RPC
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200 text-left leading-normal">
                    <strong>Recommended:</strong> Use a private RPC for best performance when reading logs and listening to events.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="rpc-url">RPC URL</Label>
                  <Input
                    id="rpc-url"
                    value={rpcUrl}
                    onChange={(e) => setRpcUrl(e.target.value)}
                    placeholder="https://your-rpc-endpoint.com"
                    className="font-mono text-sm"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSetRPC} 
                    disabled={!rpcUrl.trim()}
                    className="flex-1"
                  >
                    Set RPC
                  </Button>
                  <Button 
                    onClick={handleUsePublicRPC} 
                    variant="outline" 
                    className="flex-1"
                  >
                    Use Public RPC
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Public RPC: base-sepolia.drpc.org
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
