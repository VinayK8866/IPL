"use client";

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Maximize2, Share2, Settings, Zap } from 'lucide-react';
import Scoreboard from '@/components/dashboard/Scoreboard';
import PitchMap3D from '@/components/dashboard/PitchMap3D';
import MomentumHeatmap from '@/components/dashboard/MomentumHeatmap';
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus';
import { HypeMeter } from '@/components/gaming/HypeMeter';
import { PredictionInterface } from '@/components/gaming/PredictionInterface';
import { HypeChat } from '@/components/chat/HypeChat';
import { LatencySlider } from '@/components/dashboard/LatencySlider';
import { WagonWheel } from '@/components/dashboard/WagonWheel';
import { PerformanceClusters } from '@/components/dashboard/PerformanceClusters';
import AINarrator from '@/components/dashboard/AINarrator';
import { VFXProvider, useVFX } from '@/components/dashboard/vfx/VFXProvider';
import { EventExplosion } from '@/components/dashboard/vfx/EventExplosion';
import { useCricketRealtime } from '@/hooks/useCricketRealtime';
import { useEffect } from 'react';

const MatchView = () => {
  const { id } = useParams<{ id: string }>();
  const { score, trigger } = useCricketRealtime(id);
  const { triggerExplosion } = useVFX();

  const teamAHype = Math.round((score?.win_prob_a || 0.5) * 100);
  const teamBHype = 100 - teamAHype;

  // Global VFX Triggers
  useEffect(() => {
    if (trigger === 'BOUNDARY_FOUR') triggerExplosion('four', teamAHype > teamBHype ? '#7A3FE1' : '#FF3366');
    if (trigger === 'BOUNDARY_SIX') triggerExplosion('six', teamAHype > teamBHype ? '#7A3FE1' : '#FF3366');
    if (trigger === 'WICKET') triggerExplosion('wicket', '#FF3366');
  }, [trigger, teamAHype, teamBHype]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0E14] text-white selection:bg-[#FF3366]/30 overflow-hidden relative">
      <EventExplosion />
      {/* Navigation Header */}
      <header className="flex justify-between items-center p-3 border-b border-white/5 bg-[#05070A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="p-2 hover:bg-white/5 border border-white/5 skew-x-[-10deg] transition-all group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-white italic tracking-tighter uppercase leading-none">
              Visual <span className="text-[#FF3366]">Hub</span>
            </h1>
            <span className="text-[9px] font-black text-gray-600 tracking-[0.3em] uppercase mt-1">ID: {id}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <LatencySlider />
            <div className="h-6 w-px bg-white/10 mx-2" />
            <RealtimeStatus matchId={id} />
            <div className="flex items-center gap-1 ml-4 bg-[#7A3FE1]/10 px-3 py-1 border border-[#7A3FE1]/20 skew-x-[-15deg]">
                <Zap size={10} className="text-[#7A3FE1] fill-[#7A3FE1]" />
                <span className="text-[10px] font-black text-[#7A3FE1] uppercase">PROG V3</span>
            </div>
        </div>
      </header>

      {/* Main Grid Layout - 3 Columns */}
      <main className="flex-1 p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 h-[calc(100vh-64px)] overflow-hidden">
        
        {/* LEFT COLUMN: Data & Stats (3 cols) */}
        <div className="xl:col-span-3 flex flex-col gap-4 overflow-y-auto no-scrollbar pb-10">
          <Scoreboard matchId={id} />
          <HypeMeter matchId={id} />
          
          <div className="flex-1 min-h-[400px]">
             <AINarrator matchId={id} />
          </div>
          
          {/* Performance Metadata */}
          <div className="mt-auto pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
              <div className="bg-[#05070A] p-3 border border-white/5 skew-x-[-10deg]">
                  <span className="block text-[8px] font-black text-gray-600 uppercase">Input Latency</span>
                  <span className="text-xs font-black text-[#7A3FE1] tabular-nums">142ms</span>
              </div>
              <div className="bg-[#05070A] p-3 border border-white/5 skew-x-[-10deg]">
                  <span className="block text-[8px] font-black text-gray-600 uppercase">Data Stream</span>
                  <span className="text-xs font-black text-[#FF3366] tabular-nums">SYNCED</span>
              </div>
          </div>
        </div>

        {/* CENTER COLUMN: 3D Visualization (6 cols) */}
        <div className="xl:col-span-6 flex flex-col gap-4 h-full">
          <div className="flex-1 relative bg-[#1A1F29]/20 border border-white/10 group overflow-hidden">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#7A3FE1]/5 to-[#FF3366]/5 opacity-0 group-hover:opacity-100 blur transition duration-1000"></div>
            <PitchMap3D matchId={id} />
            
            {/* Visual Overlays */}
            <div className="absolute top-6 left-6 pointer-events-none">
                <div className="flex flex-col gap-1">
                    <span className="text-[50px] font-black italic text-white/5 leading-none tracking-tighter">PULSE_VIEW</span>
                    <span className="text-[10px] font-black text-[#7A3FE1]/60 tracking-[1em] uppercase -mt-2">Real-time Kinematics</span>
                </div>
            </div>
          </div>
          
          {/* Analytics Grid */}
          <div className="grid grid-cols-2 gap-4 h-56">
             <WagonWheel matchId={id} />
             <PerformanceClusters matchId={id} />
          </div>

          <div className="h-40">
            <MomentumHeatmap matchId={id} />
          </div>
        </div>

        {/* RIGHT COLUMN: Community & Prediction (3 cols) */}
        <div className="xl:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
          <div className="h-1/2">
            <PredictionInterface 
                matchId={id} 
                userId="00000000-0000-0000-0000-000000000000" 
            />
          </div>
          <div className="h-1/2">
            <HypeChat matchId={id} />
          </div>
        </div>

      </main>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default function MatchPage() {
  return (
    <VFXProvider>
      <MatchView />
    </VFXProvider>
  );
}
