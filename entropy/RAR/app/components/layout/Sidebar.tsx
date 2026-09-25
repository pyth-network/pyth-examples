'use client'

import Link from "next/link"
import { Library, Upload } from "lucide-react"
import { useState } from "react"

interface SidebarProps {
  onUploadClick: () => void
}

export function Sidebar({ onUploadClick }: SidebarProps) {
  return (
    <div className="w-64 bg-black p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">RAR</h1>
        <p className="text-gray-400 text-sm">Random Music Algorithm</p>
      </div>
      
      <nav className="space-y-6 flex-1">
        <div className="space-y-4">
          <Link href="/" className="flex items-center space-x-4 text-white font-semibold">
            <div className="w-6 h-6 bg-white rounded-sm"></div>
            <span>Home</span>
          </Link>
          
          <Link href="/playlist-battle/gallery" className="flex items-center space-x-4 text-gray-400 hover:text-white transition-colors">
            <div className="w-6 h-6 bg-gray-600 rounded-sm"></div>
            <span>Gallery</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-gray-800">
          
          
          <div className="space-y-2">
            <button 
              onClick={onUploadClick}
              className="flex items-center space-x-3 w-full py-2 px-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all rounded-md"
            >
              <Upload className="w-5 h-5" />
              <span>Upload Song</span>
            </button>
            
            
          </div>
        </div>
      </nav>
    </div>
  )
}