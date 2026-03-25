'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Volume2, VolumeX, Music } from 'lucide-react'

export const BackgroundMusic = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.2)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Royalty-free Cyber/Synth-wave placeholder
  const TRACK_URL = 'https://assets.mixkit.co/music/preview/mixkit-cyber-city-107.mp3'

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e))
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div className="flex items-center gap-4 bg-[#1A1F29]/80 border border-white/5 p-2 px-4 skew-x-[-15deg] backdrop-blur-md">
      <div className="flex items-center gap-2 skew-x-[15deg]">
        <Music size={14} className="text-[#7A3FE1] animate-pulse" />
        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Atmosphere</span>
      </div>
      
      <button 
        onClick={togglePlay}
        className="p-1 hover:bg-white/5 transition-colors skew-x-[15deg]"
      >
        {isPlaying ? <Volume2 size={16} className="text-[#FF3366]" /> : <VolumeX size={16} className="text-gray-500" />}
      </button>

      <div className="flex items-center gap-1 skew-x-[15deg]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div 
            key={i} 
            className={`w-1 bg-[#7A3FE1] transition-all duration-300 ${isPlaying ? 'animate-bounce' : 'h-1'}`}
            style={{ 
              height: isPlaying ? `${Math.random() * 16 + 4}px` : '4px',
              animationDelay: `${i * 0.1}s` 
            }}
          />
        ))}
      </div>

      <audio 
        ref={audioRef}
        src={TRACK_URL}
        loop
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  )
}
