'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabaseClient';
import { HypeBurst } from '../dashboard/HypeBurst';
import { useVFX } from '../dashboard/vfx/VFXProvider';
import { useMatchData } from '@/providers/MatchDataProvider';

/**
 * PROJECT CRICKET PULSE - GLOBAL HYPE METER
 * 
 * High-performance 'Tug-of-War' component featuring real-time aggregation 
 * of user 'hype clicks' via Supabase. Adheres to "Cyber-Sport" aggressive UI patterns.
 */

interface HypeMeterProps {
  matchId: string;
  teamA?: { name: string; color: string };
  teamB?: { name: string; color: string };
}

export const HypeMeter = React.memo(({ 
  matchId, 
  teamA: propTeamA, 
  teamB: propTeamB 
}: HypeMeterProps) => {
  const { hype, score } = useMatchData();
  
  const teamA = useMemo(() => ({
    name: propTeamA?.name || score?.team_a || 'TEAM A',
    color: propTeamA?.color || '#FFD700'
  }), [propTeamA, score?.team_a]);

  const teamB = useMemo(() => ({
    name: propTeamB?.name || score?.team_b || 'TEAM B',
    color: propTeamB?.color || '#7A3FE1'
  }), [propTeamB, score?.team_b]);
  
  const [localClicksA, setLocalClicksA] = useState(0);
  const [localClicksB, setLocalClicksB] = useState(0);

  const springConfig = { damping: 25, stiffness: 120, bounce: 0.4 };
  const percentageA = useSpring(50, springConfig);

  const effectiveA = (hype?.team_a_clicks || 0) + localClicksA;
  const effectiveB = (hype?.team_b_clicks || 0) + localClicksB;
  const total = effectiveA + effectiveB || 100;
  const calcPercentA = (effectiveA / total) * 100;

  useEffect(() => {
    percentageA.set(calcPercentA);
  }, [calcPercentA, percentageA]);

  const { triggerShake } = useVFX();

  const handleBoost = useCallback(async (team: 'a' | 'b') => {
    if (team === 'a') setLocalClicksA(prev => prev + 1);
    else setLocalClicksB(prev => prev + 1);

    triggerShake(0.5, 200);

    const { error } = await supabase.rpc('increment_match_hype', {
      p_match_id: matchId,
      p_team: team === 'a' ? 'team_a' : 'team_b'
    });

    if (error) {
      console.error('Hype Sync Error:', error);
    }
  }, [matchId, triggerShake]);

  return (
    <div className="w-full flex flex-col gap-4 p-8 bg-[#0B0E14] border-l-4 border-[#7A3FE1] shadow-2xl skew-x-[-2deg] select-none relative overflow-hidden">
      <div className="flex justify-between items-baseline mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-50 text-white">Domination Meter</span>
          <div className="flex gap-4 items-center mt-1">
            <span className="text-2xl font-black italic tracking-tighter" style={{ color: teamA.color }}>
              {Math.round(calcPercentA)}%
            </span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">VS</span>
            <span className="text-2xl font-black italic tracking-tighter" style={{ color: teamB.color }}>
              {Math.round(100 - calcPercentA)}%
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Global Hype Level</span>
          <span className="text-lg font-black italic text-white leading-none mt-1">
             {(effectiveA + effectiveB).toLocaleString()} ⚡
          </span>
        </div>
      </div>

      <div className="h-12 w-full bg-[#1A1F29]/50 relative overflow-hidden flex transform skew-x-[-15deg] border border-white/5">
        <motion.div 
          className="h-full relative overflow-hidden" 
          style={{ 
            width: useTransform(percentageA, (v) => `${v}%`),
            backgroundColor: teamA.color,
            boxShadow: `inset 0 0 20px ${teamA.color}88`
          }}
        >
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-black font-black italic text-[10px] tracking-tighter mix-blend-overlay uppercase">
              {teamA.name}
           </span>
        </motion.div>

        <motion.div 
          className="h-full flex-1 relative overflow-hidden" 
          style={{ 
            backgroundColor: teamB.color,
            boxShadow: `inset 0 0 20px ${teamB.color}88`
          }}
        >
           <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/10 to-transparent animate-pulse" />
           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-black italic text-[10px] tracking-tighter mix-blend-overlay uppercase">
              {teamB.name}
           </span>
        </motion.div>

        <motion.div 
          className="absolute top-0 bottom-0 w-1 bg-white z-10 shadow-[0_0_20px_white]" 
          style={{ left: useTransform(percentageA, (v) => `${v}%`) }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleBoost('a')}
          className="py-4 font-black italic text-[11px] uppercase tracking-[0.2em] skew-x-[-15deg] transition-all
            bg-transparent border-2 border-[#FFD700] hover:bg-[#FFD700] hover:text-black text-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.1)]"
        >
          Boost {teamA.name}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleBoost('b')}
          className="py-4 font-black italic text-[11px] uppercase tracking-[0.2em] skew-x-[-15deg] transition-all
            bg-transparent border-2 border-[#7A3FE1] hover:bg-[#7A3FE1] hover:text-white text-[#7A3FE1] shadow-[0_0_20px_rgba(122,63,225,0.1)]"
        >
          Boost {teamB.name}
        </motion.button>
      </div>

      <HypeBurst />

      <div className="flex justify-center mt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 skew-x-[-5deg]">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,1)]" />
          <span className="text-[8px] font-bold text-gray-500 tracking-widest uppercase italic">
            MATCH SYNC: AGGREGATING WORLDWIDE HYPE...
          </span>
        </div>
      </div>
    </div>
  );
});

HypeMeter.displayName = 'HypeMeter';
