'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StreamPitchMap } from '@/components/stream-layout/PitchMap3D';
import { ScrollingTicker } from '@/components/stream-layout/ScrollingTicker';
import { BroadcastChat } from '@/components/stream-layout/BroadcastChat';
import Scoreboard from '@/components/dashboard/Scoreboard';
import { useCricketRealtime } from '@/hooks/useCricketRealtime';
import { APP_CONFIG } from '@/lib/config';
import { VFXProvider, useVFX } from '@/components/dashboard/vfx/VFXProvider';
import { EventExplosion } from '@/components/dashboard/vfx/EventExplosion';
import { BackgroundMusic } from '@/components/stream-layout/BackgroundMusic';
import AINarrator from '@/components/dashboard/AINarrator';
import { useAuth } from '@/providers/AuthProvider';

import { useRouter } from 'next/navigation';

const StreamView = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  
  const queryId = searchParams.get('id');
  const MATCH_ID = queryId || APP_CONFIG.DEFAULT_MATCH_ID;

  // Security: Redirect non-admins to public match view
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push(`/match/${MATCH_ID}`);
    }
  }, [isAdmin, loading, MATCH_ID, router]);

  const { score, trigger } = useCricketRealtime(MATCH_ID);
  const { triggerExplosion } = useVFX();

  const teamA = score?.team_a || 'LSG';
  const teamB = score?.team_b || 'KKR';
  const teamAHype = Math.round((score?.win_prob_a || 0.5) * 100);
  const teamBHype = 100 - teamAHype;

  // Sync Triggers to GLSL Explosions
  useEffect(() => {
    if (trigger === 'BOUNDARY_FOUR') triggerExplosion('four', teamAHype > teamBHype ? '#7A3FE1' : '#FF3366');
    if (trigger === 'BOUNDARY_SIX') triggerExplosion('six', "#FFD700");
    if (trigger === 'WICKET') triggerExplosion('wicket', '#FF3366');
  }, [trigger, teamAHype, teamBHype, triggerExplosion]);

  return (
    <main className="fixed inset-0 bg-[#0B0E14] overflow-hidden flex flex-col p-0 font-sans selection:bg-pink-500/30">
      {/* 1. Cinematic 3D Background */}
      <div className="absolute inset-0 z-0">
        <StreamPitchMap matchId={MATCH_ID} />
      </div>

      <EventExplosion />

      {/* 2. TOP HUD: Branding & Score */}
      <div className="absolute top-0 inset-x-0 z-20 flex justify-between p-10 pointer-events-none items-start bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex flex-col gap-6">
           <div className="flex items-center gap-4">
              <div className="h-12 w-2 bg-pink-600 shadow-[0_0_20px_#FF3366] skew-x-[-20deg]" />
              <div>
                <h1 className="text-5xl font-black italic tracking-tighter text-white uppercase leading-none">
                  CRICKET <span className="text-gold-500 underline decoration-pink-600 underline-offset-8">PULSE</span>
                </h1>
                <span className="text-[10px] font-black tracking-[0.6em] text-pink-500 uppercase mt-2 block">Visual Data Engine Active</span>
              </div>
           </div>
           
           <div className="w-[500px] pointer-events-auto transform scale-110 origin-top-left">
              <Scoreboard matchId={MATCH_ID} />
           </div>
        </div>

        <div className="flex flex-col items-end gap-2 bg-black/40 p-4 border-r-4 border-pink-600 skew-x-[-10deg]">
           <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest skew-x-[10deg]">Engagement Meter</span>
           <div className="flex gap-1 items-center skew-x-[10deg]">
              <div className="w-12 h-1 bg-pink-600 animate-pulse" />
              <div className="w-12 h-1 bg-white/20" />
           </div>
           <span className="text-xl font-black italic text-white uppercase skew-x-[10deg]">Hype Stream</span>
        </div>
      </div>

      {/* 3. RIGHT OVERLAY: THE AI NARRATOR */}
      <div className="absolute bottom-32 right-10 z-30 w-[450px] h-[550px] pointer-events-auto shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5 opacity-90 hover:opacity-100 transition-opacity">
         <div className="absolute -top-10 right-0">
            <div className="bg-pink-600 text-[10px] font-black text-white px-4 py-1 italic uppercase tracking-tighter skew-x-[-15deg]">
               Live AI Narrator Feed
            </div>
         </div>
         <AINarrator matchId={MATCH_ID} />
      </div>

      {/* 4. CHAT OVERLAY */}
      <div className="absolute bottom-32 left-10 z-30 w-96 max-h-[400px] pointer-events-auto overflow-hidden">
         <BroadcastChat matchId={MATCH_ID} />
      </div>

      {/* 5. BOTTOM BAR */}
      <footer className="absolute bottom-0 inset-x-0 z-40 pointer-events-none">
         <div className="flex justify-between items-end px-12 mb-4">
            <div className="flex flex-col gap-2">
               <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.5em] px-2 border-l-2 border-blue-500">Live Telemetry Synchronized</span>
               <div className="flex gap-4">
                  <div className="flex flex-col gap-1">
                     <span className="text-[8px] text-white/40 font-black uppercase">{teamA} PROB</span>
                     <div className="h-2 w-48 bg-blue-900/40 relative">
                        <div className="absolute inset-y-0 left-0 bg-blue-500 shadow-[0_0_20px_#00D4FF] transition-all duration-1000" style={{ width: `${teamAHype}%` }} />
                     </div>
                  </div>
                  <div className="flex flex-col gap-1">
                     <span className="text-[8px] text-white/40 font-black uppercase">{teamB} PROB</span>
                     <div className="h-2 w-32 bg-pink-900/40 relative">
                        <div className="absolute inset-y-0 left-0 bg-pink-500 shadow-[0_0_20px_#FF3366] transition-all duration-1000" style={{ width: `${teamBHype}%` }} />
                     </div>
                  </div>
               </div>
            </div>

            <div className="pointer-events-auto">
               <BackgroundMusic />
            </div>

            <div className="px-10 py-4 bg-gradient-to-r from-[#0B0E14] to-transparent border-r-8 border-gold-500">
               <span className="text-4xl font-black italic text-white drop-shadow-[0_0_5px_rgba(0,0,0,0.5)] uppercase tracking-tighter">
                  {teamA} <span className="text-gray-600 text-xl not-italic tracking-normal">VS</span> {teamB}
               </span>
            </div>
         </div>

         <div className="pointer-events-auto">
           <ScrollingTicker />
         </div>
      </footer>

      <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_300px_rgba(0,0,0,1)] opacity-60" />
    </main>
  );
};

export default function StreamPage() {
  return (
    <VFXProvider>
      <Suspense fallback={<div className="fixed inset-0 bg-[#0B0E14] flex items-center justify-center text-white italic font-black">INITIALIZING BROADCAST ENGINE...</div>}>
        <StreamView />
      </Suspense>
    </VFXProvider>
  );
}
