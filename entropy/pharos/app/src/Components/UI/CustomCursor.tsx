"use client"
import React, { useEffect, useState } from 'react'
import { IoPaperPlane } from 'react-icons/io5'
import { TbHandFinger, TbHandGrab } from 'react-icons/tb'

type CursorState = 'default' | 'pointer' | 'clicking'

const CustomCursor = () => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const [cursorState, setCursorState] = useState<CursorState>('default')
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const updateCursorPosition = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Check if hovering over clickable elements
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.classList.contains('cursor-pointer') ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('.cursor-pointer')
      ) {
        setCursorState('pointer')
      } else {
        setCursorState('default')
      }
    }

    const handleMouseDown = () => {
      setCursorState('clicking')
    }

    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Reset to appropriate state after click
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.classList.contains('cursor-pointer') ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('.cursor-pointer')
      ) {
        setCursorState('pointer')
      } else {
        setCursorState('default')
      }
    }

    const handleMouseEnter = () => {
      setIsVisible(true)
    }

    const handleMouseLeave = () => {
      setIsVisible(false)
    }

    // Add event listeners
    document.addEventListener('mousemove', updateCursorPosition)
    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      document.removeEventListener('mousemove', updateCursorPosition)
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  const getCursorIcon = () => {
    switch (cursorState) {
      case 'pointer':
        return <TbHandFinger className="text-white" size={32} />
      case 'clicking':
        return <TbHandGrab className="text-white" size={32} />
      default:
        return <IoPaperPlane className="text-[#8b5cf6]" size={30} />
    }
  }

  if (!isVisible) return null

  return (
    <div
      className="custom-cursor fixed pointer-events-none transition-transform duration-100"
      style={{
        left: `${cursorPosition.x}px`,
        top: `${cursorPosition.y}px`,
        zIndex: 2147483647, // Maximum z-index value
        // transform: cursorState === 'clicking' ? 'scale(0.8)' : 'scale(1)',
      }}
    >
      <div
        className={`
          relative
          ${cursorState === 'clicking' ? 'animate-pulse' : ''}
          transition-transform duration-200
        `}
        style={{
          filter: 'drop-shadow(2px 2px 0px rgba(0, 0, 0, 0.3))',
        }}
      >
        {getCursorIcon()}
      </div>
    </div>
  )
}

export default CustomCursor
