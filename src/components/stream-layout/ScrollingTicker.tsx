"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, ShieldAlert, Cpu } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { APP_CONFIG } from '@/lib/config';
import { useCricketRealtime } from '@/hooks/useCricketRealtime';

interface TickerItem {
  id: string | number;
  type: 'EXPERT' | 'HYPE' | 'TACTICAL' | 'UPDATE';
  text: string;
}

export const ScrollingTicker = React.memo(({ matchId }: { matchId: string }) => {
  const { score } = useCricketRealtime(matchId || APP_CONFIG.DEFAULT_MATCH_ID);
  
  const scrollingItems = useMemo(() => {
    if (score) {
      return [
        { id: 's1', type: 'UPDATE' as const, text: `PULSE DATA ENGINE: ${score.status?.toUpperCase()} | CRR: ${score.crr || '0.0'} | SYNC ACTIVE` },
        { id: 's2', type: 'TACTICAL' as const, text: `GEMINI AI: TARGET PREDICTION ~${score.predicted_score || '0'} | MOMENTUM: ${score.win_prob_a > 0.5 ? 'STRONG' : 'STABLE'}` },
        { id: 's3', type: 'UPDATE' as const, text: `${score.team_a} vs ${score.team_b} | ${score.status_text || 'LIVE BROADCAST'}` },
        { id: 's4', type: 'TACTICAL' as const, text: `CYBER FEED: HIGH-SENTIMENT PEAK DETECTED | ANALYZING VOLATILITY...` }
      ];
    }
    return [
      { id: 1, type: 'UPDATE' as const, text: 'INITIALIZING PULSE DATA ENGINE... 20ms LOCAL SYNC ACTIVE' },
      { id: 2, type: 'TACTICAL' as const, text: 'GEMINI AI: ANALYZING MOMENTUM VOLATILITY FOR NEXT OVER' }
    ];
  }, [score]);

  const items = useMemo(() => [...scrollingItems, ...scrollingItems, ...scrollingItems], [scrollingItems]);

  return (
    <div className="w-full bg-[#05070A]/80 border-t-2 border-pink-600/50 backdrop-blur-xl h-16 flex items-center overflow-hidden relative">
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 px-6 h-full flex items-center gap-3 z-10 skew-x-[-15deg] translate-x-[-10px] shadow-[10px_0_20px_rgba(0,0,0,0.5)]">
        <Cpu size={20} className="text-white fill-white animate-pulse" />
        <span className="text-sm font-black italic text-white uppercase tracking-tighter skew-x-[15deg] drop-shadow-md">
          CYBER BROADCAST FEED
        </span>
      </div>

      <div className="flex-1 relative overflow-hidden h-full flex items-center">
        <motion.div
          animate={{ x: [0, -1500] }}
          transition={{ duration: 40, ease: "linear", repeat: Infinity }}
          className="flex whitespace-nowrap gap-12"
        >
          {scrollingItems.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {item.type === 'UPDATE' && <Cpu size={14} className="text-blue-400" />}
                {item.type === 'TACTICAL' && <Zap size={14} className="text-[#FF3366] animate-pulse" />}
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  item.type === 'TACTICAL' ? 'text-[#FF3366]' : 'text-blue-400'
                }`}>
                  {item.type}:
                </span>
              </div>
              <span className="text-sm font-black text-white/90 tracking-wider font-mono italic">
                {item.text}
              </span>
              <span className="text-blue-500/20 mx-4 font-black">:::</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-[#0B0E14] to-transparent pointer-events-none z-10" />
    </div>
  );
});

ScrollingTicker.displayName = 'ScrollingTicker';
