'use client'

import React from 'react'
import { HypeChat } from '@/components/chat/HypeChat'
import MomentumHeatmap from '@/components/dashboard/MomentumHeatmap'
import PitchMap3D from '@/components/dashboard/PitchMap3D'
import Scoreboard from '@/components/dashboard/Scoreboard'
import LatencySlider from '@/components/dashboard/LatencySlider'
import { HypeBurst } from '@/components/dashboard/HypeBurst'
import { useCricketRealtime } from '@/hooks/useCricketRealtime'
import { APP_CONFIG } from '@/lib/config'

export default function Home() {
  const MATCH_ID = APP_CONFIG.DEFAULT_MATCH_ID;
  const { score } = useCricketRealtime(MATCH_ID);

  // Derived stats for header
  const teamA = score?.team_a || 'LSG';
  const teamB = score?.team_b || 'KKR';
  const teamAHype = Math.round((score?.win_prob_a || 0.5) * 100);
  const teamBHype = 100 - teamAHype;

  return (
    <main className="flex-1 flex flex-col p-4 gap-4 bg-deep-navy overflow-hidden">
      {/* Top Header Section */}
      <header className="flex justify-between items-center px-6 py-4 bg-black/40 border-b border-white/5 backdrop-blur-sm">
        <div className="branding">
          <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase flex items-center gap-2">
            Cricket <span className="text-gold-csk drop-shadow-[0_0_8px_gold]">Pulse</span>
            <span className="text-[10px] bg-neon-pink px-2 py-0.5 ml-2 animate-pulse">LIVE</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-8 font-black text-xl italic">
          <div className="text-white">{teamA}</div>
          <div className="text-sm px-2 border border-neon-pink text-neon-pink bg-neon-pink/10">VS</div>
          <div className="text-white">{teamB}</div>
        </div>

        <div className="flex gap-6 items-center">
          <div className="text-right">
            <div className="text-xs text-white/50 uppercase font-bold">Fan Coins</div>
            <div className="text-gold-csk font-black">1,240</div>
          </div>
          <div className="h-8 w-8 bg-electric-purple/20 border border-electric-purple flex items-center justify-center font-black text-xs">
            LV4
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4">
        
        {/* Left Column: Stats */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          <LatencySlider />
          <div className="p-4 bg-black/30 border border-white/5 flex-none h-60">
            <h3 className="text-[10px] uppercase font-bold text-white/40 mb-2">Momentum Wave</h3>
            <MomentumHeatmap matchId={MATCH_ID} />
          </div>
          <div className="p-4 bg-black/30 border border-white/5 flex-1">
             <Scoreboard matchId={MATCH_ID} />
          </div>
        </div>

        {/* Center: 3D Visualization */}
        <div className="col-span-12 lg:col-span-6 bg-black/20 border border-white/5 relative overflow-hidden">
          <PitchMap3D matchId={MATCH_ID} />
          
          {/* Bottom Bar overlay inside pitch map */}
          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black to-transparent pointer-events-none">
            <div className="h-1 bg-white/10 relative">
               <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-pink-600 shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-1000" style={{ width: `${teamAHype}%` }}></div>
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-black uppercase tracking-widest italic">
              <span className="text-electric-purple">{teamA} HYPE {teamAHype}%</span>
              <span className="text-neon-pink">{teamB} HYPE {teamBHype}%</span>
            </div>
          </div>
        </div>

        {/* Right Column: AI Chat & Gamification */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 overflow-hidden cyber-card">
            <HypeChat matchId={MATCH_ID} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button className="btn-cyber font-black text-[10px] p-4 text-center transition-all hover:brightness-125 active:scale-95">SPAM {teamA}</button>
            <button className="btn-gold font-black text-[10px] p-4 text-center transition-all hover:brightness-125 active:scale-95">SPAM {teamB}</button>
          </div>
          <HypeBurst />
        </div>
      </div>
    </main>
  )
}

