'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { StreamPitchMap } from '@/components/stream-layout/PitchMap3D';
import { ScrollingTicker } from '@/components/stream-layout/ScrollingTicker';
import { BroadcastChat } from '@/components/stream-layout/BroadcastChat';
import Scoreboard from '@/components/dashboard/Scoreboard';
import { APP_CONFIG } from '@/lib/config';
import { VFXProvider, useVFX } from '@/components/dashboard/vfx/VFXProvider';
import { EventExplosion } from '@/components/dashboard/vfx/EventExplosion';
import { BackgroundMusic } from '@/components/stream-layout/BackgroundMusic';
import AINarrator from '@/components/dashboard/AINarrator';
import { MatchDataProvider, useMatchData } from '@/providers/MatchDataProvider';
import { PulsePredictor } from '@/components/gaming/PulsePredictor';

const StreamContent = () => {
  const { score, trigger, matchId } = useMatchData();
  const { triggerExplosion, triggerShake, setAura, shakeActive, aura } = useVFX();

  const teamA = score?.team_a || 'LSG';
  const teamB = score?.team_b || 'KKR';
  const teamAHype = Math.round((score?.win_prob_a || 0.5) * 100);
  const teamBHype = 100 - teamAHype;

  useEffect(() => {
    const teamAColor = '#7A3FE1';
    const teamBColor = '#FFD700'; 
    const actingTeamColor = teamAHype > teamBHype ? teamAColor : teamBColor;

    if (trigger === 'BOUNDARY_FOUR') {
      triggerExplosion('four', actingTeamColor);
      triggerShake(1, 400);
      setAura(actingTeamColor);
      setTimeout(() => setAura(null), 3000);
    }
    if (trigger === 'BOUNDARY_SIX') {
      triggerExplosion('six', '#FFD700');
      triggerShake(2, 600);
      setAura('#FFD700');
      setTimeout(() => setAura(null), 4000);
    }
    if (trigger === 'WICKET') {
      triggerExplosion('wicket', '#FF3366');
      triggerShake(3, 800);
      setAura('#FF3366');
      setTimeout(() => setAura(null), 5000);
    }
  }, [trigger, teamAHype, teamBHype, triggerExplosion, triggerShake, setAura]);

  return (
    <motion.main 
      animate={shakeActive ? {
        x: [0, -10, 10, -10, 10, 0],
        y: [0, 5, -5, 5, -5, 0],
        transition: { duration: 0.4 }
      } : {}}
      className="fixed inset-0 bg-[#0B0E14] overflow-hidden flex flex-col p-0 font-sans selection:bg-pink-500/30"
    >
      <div className="absolute inset-0 z-0">
        <StreamPitchMap matchId={matchId || ''} />
      </div>

      <AnimatePresence>
        {aura && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10"
            style={{ 
              background: `radial-gradient(circle at center, ${aura} 0%, transparent 80%)`,
              boxShadow: `inset 0 0 150px ${aura}`
            }}
          />
        )}
      </AnimatePresence>

      <EventExplosion />

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
           
           <div className="w-[550px] pointer-events-auto transform scale-110 origin-top-left">
              <Scoreboard matchId={matchId || ''} isStreamLayout={true} />
           </div>

           <div className="pointer-events-auto mt-4">
              <PulsePredictor />
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

      <div className="absolute bottom-32 right-10 z-30 w-[450px] h-[550px] pointer-events-auto shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5 opacity-90 hover:opacity-100 transition-opacity">
         <div className="absolute -top-10 right-0">
            <div className="bg-pink-600 text-[10px] font-black text-white px-4 py-1 italic uppercase tracking-tighter skew-x-[-15deg]">
               Live AI Narrator Feed
            </div>
         </div>
         <AINarrator matchId={matchId || ''} />
      </div>

      <div className="absolute bottom-32 left-10 z-30 w-96 max-h-[400px] pointer-events-auto overflow-hidden">
         <BroadcastChat matchId={matchId || ''} />
      </div>

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
           <ScrollingTicker matchId={matchId || ''} />
         </div>
      </footer>

      <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_300px_rgba(0,0,0,1)] opacity-60" />
    </motion.main>
  );
};

const StreamView = () => {
  const searchParams = useSearchParams();
  const [resolvedMatchId, setResolvedMatchId] = React.useState<string | null>(null);
  const queryId = searchParams.get('id');

  useEffect(() => {
    if (queryId) {
      setResolvedMatchId(queryId);
      return;
    }

    const findLiveMatch = async () => {
      try {
        const res = await fetch('/api/matches');
        const data = await res.json();
        if (data.matches && data.matches.length > 0) {
          const liveMatch = data.matches.find((m: any) => m.status === 'LIVE');
          setResolvedMatchId(liveMatch ? liveMatch.id : data.matches[0].id);
        } else {
          setResolvedMatchId(APP_CONFIG.DEFAULT_MATCH_ID);
        }
      } catch {
        setResolvedMatchId(APP_CONFIG.DEFAULT_MATCH_ID);
      }
    };

    findLiveMatch();
  }, [queryId]);

  return (
    <MatchDataProvider matchId={resolvedMatchId}>
       <StreamContent />
    </MatchDataProvider>
  );
};

export default function StreamPage() {
  return (
    <VFXProvider>
      <Suspense fallback={<div className="fixed inset-0 bg-[#0B0E14] flex items-center justify-center text-white italic font-black text-xl uppercase tracking-widest">INITIALIZING BROADCAST ENGINE v2.0...</div>}>
        <StreamView />
      </Suspense>
    </VFXProvider>
  );
}
