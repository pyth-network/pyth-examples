'use client'

import React from 'react'
import Dither from '../components/Dither'
import { ShimmerButton } from '../components/ui/shimmer-button'
import ShinyText from '../components/ShinyText'

export default function HomePage() {
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
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center">
          {/* Main Title */}
          <h1 className="text-7xl md:text-7xl lg:text-9xl font-black mb-8 text-white drop-shadow-2xl tracking-tight">
            whiphash.
          </h1>

          {/* Shiny Text */}
          <div className="mb-12">
            <ShinyText 
              text="built with pure high pyth entropy" 
              speed={3}
              className="text-2xl md:text-3xl lg:text-2xl font-semibold text-white/90"
            />
          </div>

          {/* Shimmer Button */}
          <div className="flex justify-center">
            <ShimmerButton
              shimmerColor="#ffffff"
              shimmerSize="0.05em"
              shimmerDuration="3s"
              borderRadius="12px"
              background="rgba(255, 255, 255, 0.1)"
              className="px-6 py-4 text-xl font-bold"
              onClick={() => window.location.href = '/test'}
            >
              get started
            </ShimmerButton>
          </div>

          {/* View Passwords Link */}
          <div className="mt-6">
            <button
              onClick={() => window.location.href = '/view'}
              className="text-white/60 hover:text-white/90 text-lg underline transition-colors duration-200"
            >
              View Saved Passwords →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
