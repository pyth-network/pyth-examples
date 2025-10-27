'use client'

import { useState, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { supabase } from '@/lib/supabase'

export const useWeb3Auth = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const signIn = useCallback(async (): Promise<boolean> => {
    if (!address || !isConnected) {
      setError('Wallet not connected')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {

      const message = `Sign in to RAR at ${new Date().toISOString()}`
      
      // Sign the message with the wallet
      const signature = await signMessageAsync({ message })
      
      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithWeb3({
        chain: 'ethereum',
        message: message,
        signature: signature,
      })

      if (error) {
        throw new Error(`Authentication failed: ${error.message}`)
      }

      console.log('Authentication successful:', data)
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [address, isConnected, signMessageAsync])

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
    }
  }, [])

  return {
    signIn,
    signOut,
    isLoading,
    error,
    clearError: () => setError(null),
    isAuthenticated: !!address && isConnected
  }
}