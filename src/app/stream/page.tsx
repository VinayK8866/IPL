'use client';

import React from 'react';
import { StreamPitchMap } from '@/components/stream-layout/PitchMap3D';
import { ScrollingTicker } from '@/components/stream-layout/ScrollingTicker';
import { BroadcastChat } from '@/components/stream-layout/BroadcastChat';
import Scoreboard from '@/components/dashboard/Scoreboard';
import { useCricketRealtime } from '@/hooks/useCricketRealtime';
import { APP_CONFIG } from '@/lib/config';

/**
 * STREAM LAYOUT PAGE (/stream)
 * 
 * High-adrenaline, 16:9 broadcast view for OBS/YouTube.
 * Features center-stage Three.js and real-time data visualizers.
 */

export default function StreamPage() {
  const MATCH_ID = APP_CONFIG.DEFAULT_MATCH_ID;
  const { score } = useCricketRealtime(MATCH_ID);

  const teamA = score?.team_a || 'LSG';
  const teamB = score?.team_b || 'KKR';
  const teamAHype = Math.round((score?.win_prob_a || 0.5) * 100);
  const teamBHype = 100 - teamAHype;

  return (
    <main className="fixed inset-0 bg-[#0B0E14] overflow-hidden flex flex-col items-center justify-center p-0">
      {/* Cinematic 3D Background */}
      <div className="absolute inset-0 z-0">
        <StreamPitchMap matchId={MATCH_ID} />
      </div>

      {/* Broadcast HUD / UI Layer */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-8 pointer-events-none">
        
        <header className="flex justify-between items-start">
          {/* Top-Left: Branding & Live Stats */}
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase flex items-center gap-3">
              Cricket <span className="text-gold-500 drop-shadow-[0_0_12px_gold]">Pulse</span>
              <span className="text-xs bg-pink-600 px-3 py-1 ml-4 animate-pulse not-italic">LIVE BROADCAST</span>
            </h1>
            <div className="w-96 flex">
               <Scoreboard matchId={MATCH_ID} />
            </div>
          </div>

          {/* Top-Right: High-Hype Chat Overlay */}
          <div className="relative">
            <BroadcastChat matchId={MATCH_ID} />
          </div>
        </header>

        {/* Bottom Overlay Area */}
        <footer className="flex flex-col gap-4 w-full">
           <div className="flex justify-between items-end px-12 pb-4">
              <div className="flex flex-col gap-1">
                 <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.5em] mb-2 px-2 border-l-2 border-blue-500">Live Telemetry Data</span>
                 <div className="flex gap-4">
                    <div className="h-2 w-32 bg-blue-900/40 relative">
                       <div className="absolute inset-y-0 left-0 bg-blue-500 shadow-[0_0_10px_#00D4FF] transition-all duration-1000" style={{ width: `${teamAHype}%` }} />
                    </div>
                    <div className="h-2 w-24 bg-pink-900/40 relative">
                       <div className="absolute inset-y-0 left-0 bg-pink-500 shadow-[0_0_10px_#FF3366] transition-all duration-1000" style={{ width: `${teamBHype}%` }} />
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="px-6 py-2 bg-gradient-to-r from-navy-950 to-transparent border-r-2 border-gold-500">
                    <span className="text-xl font-black italic text-white drop-shadow-sm uppercase">{teamA} vs {teamB}</span>
                 </div>
              </div>
           </div>
           {/* Global News Ticker */}
           <ScrollingTicker />
        </footer>
      </div>

      {/* Screen Effects & Vignette */}
      <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)] opacity-40 mix-blend-multiply" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-16 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
    </main>
  );
}

