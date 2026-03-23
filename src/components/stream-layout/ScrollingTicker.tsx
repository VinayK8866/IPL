"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, ShieldAlert } from 'lucide-react';

/**
 * STREAM LAYOUT - SCROLLING NEWS TICKER
 * 
 * High-adrenaline marquee for match updates and Gemini-powered tactical insights.
 * Designed for OBS capture at the bottom of the screen.
 */

const TICKER_ITEMS = [
  { id: 1, type: 'EXPERT', text: 'GEMINI PREDICTION: BATTING TEAM LIKELY TO TARGET DEEP MID-WICKET IN NEXT OVER | WIN PROB: UPDATING...' },
  { id: 2, type: 'HYPE', text: 'HYPEMETER SURGE DETECTED | UNIFIED SYNC ACROSS ALL BROADCAST CHANNELS ACTIVE' },
  { id: 3, type: 'TACTICAL', text: 'FIELD ALERT: SIGNIFICANT BOWLING DEPTH SHIFT | TRACKING BALL-BY-BALL TELEMETRY' },
  { id: 4, type: 'UPDATE', text: 'REAL-TIME DATA ENGINE SYNCED: 20ms CORE LATENCY | AUTHENTIC BROADCAST FEED' },
];

export const ScrollingTicker = React.memo(() => {
  // Multiply items for seamless infinite scroll
  const scrollingItems = useMemo(() => {
    return [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];
  }, []);


  return (
    <div className="w-full bg-[#0B0E14] border-t-2 border-pink-600/50 backdrop-blur-xl h-16 flex items-center overflow-hidden relative">
      {/* Static Label Section */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 px-6 h-full flex items-center gap-3 z-10 skew-x-[-15deg] translate-x-[-10px]">
        <Zap size={20} className="text-white fill-white animate-pulse" />
        <span className="text-sm font-black italic text-white uppercase tracking-tighter skew-x-[15deg]">
          PULSE TICKER
        </span>
      </div>

      {/* Marquee Container */}
      <div className="flex-1 relative overflow-hidden h-full flex items-center">
        <motion.div
          animate={{ x: [0, -1000] }}
          transition={{
            duration: 30,
            ease: "linear",
            repeat: Infinity,
          }}
          className="flex whitespace-nowrap gap-12"
        >
          {scrollingItems.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {item.type === 'EXPERT' && <ShieldAlert size={14} className="text-gold-400" />}
                {item.type === 'HYPE' && <TrendingUp size={14} className="text-pink-500" />}
                <span className={`text-xs font-black uppercase tracking-widest ${
                  item.type === 'EXPERT' ? 'text-gold-400' : 'text-blue-400'
                }`}>
                  {item.type}:
                </span>
              </div>
              <span className="text-sm font-bold text-gray-300 tracking-wide font-mono italic">
                {item.text}
              </span>
              <span className="text-gray-700 mx-4">|</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Decorative End Piece */}
      <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-[#0B0E14] to-transparent pointer-events-none z-10" />
    </div>
  );
});

ScrollingTicker.displayName = 'ScrollingTicker';
