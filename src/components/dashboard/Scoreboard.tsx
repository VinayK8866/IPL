'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCricketRealtime } from '../../hooks/useCricketRealtime';
import { Batter, MatchScore } from '../../lib/data-engine/types';

/**
 * PROJECT CRICKET PULSE - CORE SCOREBOARD
 * 
 * High-performance, real-time scoreboard with "On-Fire" transitions.
 * Syncs with broadcast lag via match_delay_offset.
 */

// Sub-component: Numerical Value with Transition
const Counter = React.memo(({ value, className }: { value: string | number; className?: string }) => (
  <AnimatePresence mode="popLayout" initial={false}>
    <motion.span
      key={value}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={className}
    >
      {value}
    </motion.span>
  </AnimatePresence>
));
Counter.displayName = 'Counter';

// Sub-component: Active Batter Card
const ActiveBatter = React.memo(({ batter }: { batter: Batter }) => {
  const isOnFire = batter.strikeRate >= 200 && batter.balls >= 10;

  return (
    <div className={`relative p-4 bg-[#1A1F29]/80 border-l-2 ${isOnFire ? 'border-[#FF3366]' : 'border-[#7A3FE1]'} overflow-hidden group select-none`}>
      {/* Animated Fire Sprite Overlay (Global CSS) */}
      {isOnFire && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-50">
           <div className="fire-sprite-overlay absolute bottom-0 left-0 w-full h-[150%]" />
        </div>
      )}

      <div className="relative z-10 flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="font-black italic text-sm tracking-tighter text-white uppercase truncate">
            {batter.name}
          </span>
          {isOnFire && (
            <span className="text-[10px] font-black bg-[#FF3366] px-1 animate-pulse text-white">ON FIRE</span>
          )}
        </div>
        
        <div className="flex justify-between items-end">
          <div className="flex items-baseline gap-1">
            <Counter value={batter.runs} className="text-2xl font-black text-[#FFD700]" />
            <span className="text-xs text-gray-500 font-bold">({batter.balls})</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-gray-500 font-bold uppercase">Strike Rate</span>
            <span className={`text-xs font-black italic ${isOnFire ? 'text-[#FF3366]' : 'text-white'}`}>
              {(batter.strikeRate || 0).toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .fire-sprite {
          background-size: 200% 200%;
          filter: blur(4px);
        }
        @keyframes flicker {
          0% { transform: translateY(10%) scaleY(1); opacity: 0.3; }
          50% { transform: translateY(0%) scaleY(1.2); opacity: 0.6; }
          100% { transform: translateY(10%) scaleY(1); opacity: 0.3; }
        }
        .animate-flicker {
          animation: flicker 0.8s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
});
ActiveBatter.displayName = 'ActiveBatter';

// Sub-component: Team Stats
const TeamStats = React.memo(({ score }: { score: MatchScore }) => (
  <div className="flex flex-col gap-4 p-6 bg-[#0B0E14] border border-white/5 relative overflow-hidden">
    <div className="flex justify-between items-start">
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-[#7A3FE1] tracking-[0.2em] uppercase mb-1">Live Scoreboard</span>
        <div className="flex items-baseline gap-3">
          <Counter value={score.score} className="text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          <div className="flex flex-col">
            <span className="text-sm font-black text-gray-400">({score.overs})</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-end">
        <span className="text-xs font-black text-[#FFD700] uppercase tracking-widest">{score.team_a} vs {score.team_b}</span>
        <div className="mt-2 text-right">
          <div className="text-[10px] text-gray-500 font-bold uppercase leading-none">Net Run Rate</div>
          <div className="text-lg font-black italic text-white leading-none mt-1">{(score.crr || 0).toFixed(2)}</div>
        </div>
      </div>
    </div>

    {/* Predicted Final Score Placeholder */}
    <div className="bg-[#1A1F29] border-l-2 border-[#FFD700] p-2 flex justify-between items-center">
      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Predicted Target</span>
      <span className="text-sm font-black italic text-[#FFD700]">
        ~{score.predicted_score || Math.round((score.crr || 0) * 20)}
      </span>
    </div>
  </div>
));
TeamStats.displayName = 'TeamStats';

// Sub-component: Prediction Ticker
const PredictionTicker = React.memo(({ score }: { score: MatchScore }) => {
  const predictionText = useMemo(() => {
    if (!score) return "INITIALIZING AI PREDICTIONS...";
    const team = score.win_prob_a > score.win_prob_b ? score.team_a : score.team_b;
    const prob = Math.max(score.win_prob_a, score.win_prob_b) * 100;
    return `⚡ GEMINI PREDICTION: ${team} WIN PROBABILITY ${prob.toFixed(0)}% | MATCH MOMENTUM SHIFTING... | NEXT EVENT LIKELY IN 3 BALLS`;
  }, [score]);

  return (
    <div className="bg-[#05070A] p-2 border-t border-white/5 overflow-hidden whitespace-nowrap">
      <div className="inline-block animate-scroll marquee text-[10px] font-bold text-[#7A3FE1] tracking-widest uppercase italic">
        {predictionText}
      </div>
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .marquee {
          animation: scroll 20s linear infinite;
          display: block;
        }
      `}</style>
    </div>
  );
});
PredictionTicker.displayName = 'PredictionTicker';

// Main Scoreboard Component (Memoized)
export const Scoreboard = React.memo(({ matchId }: { matchId: string }) => {
  const { score } = useCricketRealtime(matchId);

  const fallbackScore: MatchScore = {
    match_id: matchId,
    team_a: 'TBA',
    team_b: 'TBA',
    score: '0/0',
    overs: '0.0',
    crr: 0,
    win_prob_a: 0.5,
    win_prob_b: 0.5,
    batters: [],
    bowlers: [],
    last_balls: [],
    timestamp: new Date().toISOString()
  };

  const currentScore = score || fallbackScore;

  return (
    <div className="flex flex-col w-full max-w-md shadow-2xl skew-x-[-2deg] hover:skew-x-0 transition-transform duration-500">
      <TeamStats score={currentScore} />
      
      {currentScore.batters.length > 0 && (
        <div className="grid grid-cols-2 gap-px bg-white/5">
          {currentScore.batters.map((batter, idx) => (
            <ActiveBatter key={`${batter.name}-${idx}`} batter={batter} />
          ))}
        </div>
      )}

      <PredictionTicker score={currentScore} />
    </div>
  );
});

Scoreboard.displayName = 'Scoreboard';

export default Scoreboard;
