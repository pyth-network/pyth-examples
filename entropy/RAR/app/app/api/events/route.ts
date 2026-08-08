import { NextResponse } from 'next/server'
import { startDecayListener } from '@/lib/decayListener'

export const maxDuration = 300 // 5 minutes

let isListenerRunning = false

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (isListenerRunning) {
      return NextResponse.json({ 
        success: true, 
        message: 'Event listener already running' 
      })
    }

    console.log('Starting event listeners...')
    isListenerRunning = true
    
    // Import dynamically to avoid loading on server if not needed
    const { startDecayListener } = await import('@/lib/decayListener')
    startDecayListener()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Event listeners started' 
    })
  } catch (error: any) {
    console.error('Error starting listeners:', error)
    isListenerRunning = false
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}