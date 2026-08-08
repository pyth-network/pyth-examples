'use client'

import React, { useState, useEffect } from 'react'
import Dither from '../../components/Dither'
import { ShimmerButton } from '../../components/ui/shimmer-button'
import ShinyText from '../../components/ShinyText'
import { ShineBorder } from '../../components/ui/shine-border'

interface SavedPassword {
  id: string
  name: string
  password: string
  socials: string
  createdAt: string
  txHash: string
  sequenceNumber: string
}

export default function ViewPage() {
  const [passwords, setPasswords] = useState<SavedPassword[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({})

  const fetchPasswords = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 Fetching passwords from NilDB...')
      const res = await fetch('/api/nildb/read-collection')
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      
      const result = await res.json()
      console.log('📊 API Response:', result)

      if (result.success) {
        console.log('✅ Successfully fetched passwords:', result.data)
        setPasswords(result.data || [])
      } else {
        console.error('❌ API Error:', result.error)
        setError(result.error || 'Failed to load passwords')
      }
    } catch (err) {
      console.error('❌ Fetch error:', err)
      setError((err as Error).message || 'Network error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPasswords()
  }, [])

  const togglePasswordVisibility = (passwordId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [passwordId]: !prev[passwordId]
    }))
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Dither Background */}
      <div style={{ width: '100%', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
        <Dither
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-8 text-white drop-shadow-2xl tracking-tight">
              whiphash.
            </h1>
            
            <div className="mb-8">
              <ShinyText 
                text="view your secure passwords" 
                speed={3}
                className="text-2xl md:text-3xl lg:text-2xl font-semibold text-white/90"
              />
              {!isLoading && !error && (
                <p className="text-white/60 text-lg mt-2">
                  {passwords.length} password{passwords.length !== 1 ? 's' : ''} stored
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mb-8">
              <ShimmerButton
                shimmerColor="#ffffff"
                shimmerSize="0.05em"
                shimmerDuration="3s"
                borderRadius="12px"
                background="rgba(255, 255, 255, 0.1)"
                className="px-6 py-3 text-lg font-bold"
                onClick={() => window.history.back()}
              >
                ← Back to Home
              </ShimmerButton>
              <ShimmerButton
                shimmerColor="#ffffff"
                shimmerSize="0.05em"
                shimmerDuration="3s"
                borderRadius="12px"
                background="rgba(255, 255, 255, 0.1)"
                className="px-6 py-3 text-lg font-bold"
                onClick={fetchPasswords}
                disabled={isLoading}
              >
                {isLoading ? '🔄 Loading...' : '🔄 Refresh'}
              </ShimmerButton>
            </div>
          </div>

          {/* Content Area */}
          <div className="space-y-6">
            {error && error.includes('Missing required environment variables') ? (
              <div className="text-center">
                <div className="relative p-8 bg-black/20 backdrop-blur-sm rounded-2xl">
                  <ShineBorder
                    borderWidth={2}
                    duration={8}
                    shineColor={["#ffffff", "#fbbf24", "#ffffff"]}
                    className="rounded-2xl"
                  />
                  
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-white mb-4">⚠️ Environment Variables Missing</h3>
                    <p className="text-white/80 mb-6">
                      Create a .env.local file in your project root with the following variables:
                    </p>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/20 mb-6">
                      <pre className="text-white/90 text-sm text-left">
{`NILLION_API_KEY=your-api-key-here
NILLION_COLLECTION_ID=your-collection-id-here`}
                      </pre>
                    </div>
                    <ShimmerButton
                      shimmerColor="#ffffff"
                      shimmerSize="0.05em"
                      shimmerDuration="3s"
                      borderRadius="12px"
                      background="rgba(255, 255, 255, 0.1)"
                      className="px-6 py-3 text-lg font-bold"
                      onClick={() => window.location.href = '/test'}
                    >
                      Go to Password Generator
                    </ShimmerButton>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white text-xl">Loading passwords...</p>
              </div>
            ) : error ? (
              <div className="p-6 bg-red-500/20 border border-red-500/30 rounded-xl backdrop-blur-sm">
                <p className="text-red-200 text-center">{error}</p>
              </div>
            ) : passwords.length === 0 ? (
              <div className="text-center">
                <div className="relative p-8 bg-black/20 backdrop-blur-sm rounded-2xl">
                  <ShineBorder
                    borderWidth={2}
                    duration={8}
                    shineColor={["#ffffff", "#60a5fa", "#ffffff"]}
                    className="rounded-2xl"
                  />
                  
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-white mb-4">🔍 No Passwords Found</h3>
                      <p className="text-white/80 mb-6">
                        You haven&apos;t generated any passwords yet. Generate your first secure password to see it here.
                      </p>
                    <ShimmerButton
                      shimmerColor="#ffffff"
                      shimmerSize="0.05em"
                      shimmerDuration="3s"
                      borderRadius="12px"
                      background="rgba(255, 255, 255, 0.1)"
                      className="px-6 py-3 text-lg font-bold"
                      onClick={() => window.location.href = '/test'}
                    >
                      Generate Password
                    </ShimmerButton>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Password List */}
                {passwords.map((password) => (
                  <div key={password.id} className="relative p-6 bg-black/20 backdrop-blur-sm rounded-2xl">
                    <ShineBorder
                      borderWidth={2}
                      duration={8}
                      shineColor={["#ffffff", "#60a5fa", "#ffffff"]}
                      className="rounded-2xl"
                    />
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">{password.name}</h3>
                          <p className="text-white/60 text-sm">
                            Created: {new Date(password.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <ShimmerButton
                            shimmerColor="#ffffff"
                            shimmerSize="0.05em"
                            shimmerDuration="3s"
                            borderRadius="8px"
                            background="rgba(255, 255, 255, 0.1)"
                            className="px-4 py-2 text-sm font-medium"
                            onClick={() => togglePasswordVisibility(password.id)}
                          >
                            {showPassword[password.id] ? '👁️ Hide' : '👁️ Show'}
                          </ShimmerButton>
                          <ShimmerButton
                            shimmerColor="#ffffff"
                            shimmerSize="0.05em"
                            shimmerDuration="3s"
                            borderRadius="8px"
                            background="rgba(255, 255, 255, 0.1)"
                            className="px-4 py-2 text-sm font-medium"
                            onClick={() => copyToClipboard(password.password)}
                          >
                            📋 Copy
                          </ShimmerButton>
                        </div>
                      </div>

                      {/* Password Display */}
                      <div className="mb-4">
                        <div className="bg-black/40 p-4 rounded-xl border border-white/20">
                          <code className="text-lg font-mono break-all text-white">
                            {showPassword[password.id] ? password.password : '•'.repeat(password.password.length)}
                          </code>
                        </div>
                      </div>

                      {/* Socials */}
                      {password.socials && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-white/80 mb-2">📝 Socials:</h4>
                          <div className="bg-black/30 p-3 rounded-lg border border-white/10">
                            <p className="text-white/70 text-sm whitespace-pre-wrap">{password.socials}</p>
                          </div>
                        </div>
                      )}

                      {/* Transaction Info */}
                      <div className="text-xs text-white/50 space-y-1">
                        <p>Transaction: {password.txHash}</p>
                        <p>Sequence: {password.sequenceNumber}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
