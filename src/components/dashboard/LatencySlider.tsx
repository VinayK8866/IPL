"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useLatency } from '@/providers/LatencyProvider';
import { Zap, Clock } from 'lucide-react';

/**
 * LatencySlider Component
 * 
 * Cyber-Sport aesthetic slider for match-delay-offset adjustments.
 * Zero rounded corners, high-contrast neon highlights.
 */

const RANGE = 60; // 0-60 seconds

export const LatencySlider = () => {
  const { offset, setOffset } = useLatency();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOffset(parseInt(e.target.value, 10));
  };

  return (
    <div className="p-4 bg-[#0B0E14] border border-blue-500/20 relative group">
      {/* Corner Glows */}
      <div className="absolute top-0 left-0 w-2 h-2 bg-pink-500/50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 bg-gold-400/50" />

      <div className="flex justify-between items-center mb-3">
        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 flex items-center gap-2 italic">
          <Clock size={12} className="animate-pulse" />
          Latency Synchronization
        </label>
        <span className="text-xl font-black italic text-pink-500 drop-shadow-[0_0_8px_rgba(255,51,102,0.6)]">
          {offset}s <span className="text-[10px] text-gray-500">DELAY</span>
        </span>
      </div>

      <div className="relative h-6 flex items-center">
        {/* Track Custom Background */}
        <div className="absolute inset-x-0 h-1 bg-blue-900/30 overflow-hidden">
          <motion.div 
            initial={false}
            animate={{ width: `${(offset / RANGE) * 100}%` }}
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
          />
        </div>

        {/* Real HTML Range Slider overlay */}
        <input 
          type="range"
          min="0"
          max={RANGE}
          value={offset}
          onChange={handleSliderChange}
          className="absolute inset-x-0 h-6 bg-transparent appearance-none cursor-pointer z-10"
          style={{
             WebkitAppearance: 'none'
          }}
        />

        {/* Notch markers for every 10 seconds */}
        <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 pointer-events-none">
          {[...Array(7)].map((_, i) => (
             <div key={i} className={`w-0.5 h-1 ${i*10 <= offset ? 'bg-pink-500' : 'bg-blue-900/40'}`} />
          ))}
        </div>
      </div>

      {/* Visual Indicator of spoiler prevention status */}
      <div className="mt-3 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className={`w-1 h-1 rounded-full ${offset > 0 ? 'bg-green-500 pulse' : 'bg-red-500'}`} />
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                {offset > 0 ? "Spoiler Protection Active" : "Realtime (Possible Spoilers)"}
              </span>
           </div>
           <Zap size={10} className="text-gold-400 animate-bounce" />
      </div>

      <style jsx>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 20px;
          width: 6px;
          background: #FFD700;
          border: none;
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
          cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
          height: 20px;
          width: 6px;
          background: #FFD700;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default LatencySlider;
