'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Batter, MatchScore, Bowler } from '../../lib/data-engine/types';
import { usePlayerFireState } from '../../hooks/usePlayerFireState';
import { PlayerFireVFX } from './PlayerFireVFX';
import { useMatchData } from '../../providers/MatchDataProvider';

/**
 * PROJECT CRICKET PULSE - CORE SCOREBOARD
 * 
 * High-performance, real-time scoreboard with "On-Fire" transitions.
 */

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

const ActiveBatter = React.memo(({ batter, matchId, isStreamLayout }: { batter: Batter; matchId: string; isStreamLayout?: boolean }) => {
  const { isGlowing, intensity } = usePlayerFireState(batter.name, matchId);

  return (
    <PlayerFireVFX isGlowing={isGlowing} intensity={intensity}>
      <div className={`relative p-4 bg-[#1A1F29]/95 border-l-2 ${isGlowing ? 'border-[#FF3366]' : 'border-[#7A3FE1]'} overflow-hidden group select-none h-full`}>
        <div className="relative z-10 flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-black italic text-[11px] tracking-tighter text-white uppercase truncate max-w-[120px]">
                {batter.name}
              </span>
              {isStreamLayout && (
                <span className="text-[7px] font-bold text-white/30 uppercase tracking-[0.2em]">Active Gladiator</span>
              )}
            </div>
            {isGlowing && (
              <span className="text-[8px] font-black bg-[#FF3366] px-2 py-0.5 animate-pulse text-white shadow-[0_0_12px_#FF3366]">ON FIRE</span>
            )}
          </div>
          
          <div className="flex justify-between items-end mt-1">
            <div className="flex items-baseline gap-1">
              <Counter value={batter.runs} className={`${isStreamLayout ? 'text-3xl' : 'text-xl'} font-black text-[#FFD700] tabular-nums`} />
              <span className="text-[10px] text-gray-600 font-bold">({batter.balls})</span>
            </div>
            
            <div className={`flex flex-col items-end ${isStreamLayout ? 'gap-0' : ''}`}>
               {isStreamLayout && (
                 <div className="flex gap-2 mb-1">
                    <div className="flex flex-col items-center">
                       <span className="text-[6px] text-gray-500 font-black">4S</span>
                       <span className="text-[9px] font-bold text-white">{batter.fours}</span>
                    </div>
                    <div className="flex flex-col items-center">
                       <span className="text-[6px] text-gray-500 font-black">6S</span>
                       <span className="text-[9px] font-bold text-gold-500">{batter.sixes}</span>
                    </div>
                 </div>
               )}
              <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest leading-none">Strike Rate</span>
              <span className={`${isStreamLayout ? 'text-lg' : 'text-[11px]'} font-black italic ${isGlowing ? 'text-[#FF3366]' : 'text-white'} leading-none`}>
                {(batter.strikeRate || 0).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PlayerFireVFX>
  );
});
ActiveBatter.displayName = 'ActiveBatter';

const TeamStats = React.memo(({ score }: { score: MatchScore }) => (
  <div className="flex flex-col gap-4 p-6 bg-[#0B0E14] border border-white/5 relative overflow-hidden">
    <div className="flex justify-between items-start">
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-[#7A3FE1] tracking-[0.2em] uppercase mb-1">
          {score.status_text && score.status_text.includes('Live') ? 'LIVE STATS' : score.status_text || 'MATCH BOARD'}
        </span>
        <div className="flex items-baseline gap-3">
          <Counter value={score.score === '0/0' && score.status_text ? 'LIVE' : score.score} className="text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          <div className="flex flex-col">
            <span className="text-sm font-black text-gray-400">({score.overs})</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 ml-4">
        <span className="text-[10px] font-black text-[#FFD700] uppercase tracking-widest text-right">{score.team_a} vs {score.team_b}</span>
        <div className="mt-2 text-right group relative cursor-help" title="Current Run Rate: Average runs scored per over so far. High CRR indicates aggressive batting.">
          <div className="text-[8px] text-gray-400 font-black uppercase leading-none tracking-tighter">RUN RATE (CRR)</div>
          <div className="text-xl font-black italic text-white leading-none mt-1">{(score.crr || 0).toFixed(2)}</div>
        </div>
      </div>
    </div>

    <div className="bg-[#1A1F29] border-l-2 border-[#FFD700] p-2 flex justify-between items-center cursor-help"
      title={score.is_second_innings ? "Target runs needed to win the match." : "AI prediction of the final score based on current momentum."}>
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          {score.is_second_innings ? 'CHASE TARGET' : 'PREDICTED FINAL'}
        </span>
        {score.is_second_innings && score.rrr && (
          <span className="text-[8px] font-black text-[#FF3366] uppercase">Req. RR: {score.rrr}</span>
        )}
      </div>
      <div className="flex flex-col items-end">
        <span className="text-sm font-black italic text-[#FFD700]">
          {score.is_second_innings 
            ? (score.target || 'TBA') 
            : `~${Math.max(parseInt(score.score.split('/')[0]) || 0, score.predicted_score || Math.round((score.crr || 0) * 20))}`
          }
        </span>
      </div>
    </div>
  </div>
));
TeamStats.displayName = 'TeamStats';

const PredictionTicker = React.memo(({ score }: { score: MatchScore }) => {
  const narrativeBulletins = useMemo(() => {
    if (!score) return ["INITIALIZING NEURAL ANALYSIS...", "SYNCING LIVE FEED..."];
    const bulletins = [];
    const dominantTeam = score.win_prob_a > score.win_prob_b ? score.team_a : score.team_b;
    const prob = Math.max(score.win_prob_a, score.win_prob_b) * 100;
    bulletins.push(`⚡ AI PREDICTION: ${dominantTeam} WIN CHANCE ${prob.toFixed(0)}%`);
    if (score.is_second_innings && score.rrr) {
      bulletins.push(`🏹 TARGET CRITICAL: REQUIRES ${score.rrr} RUNS PER OVER`);
      if (score.win_prob_a < 0.3 || score.win_prob_b < 0.3) {
        bulletins.push(`🚨 MOMENTUM SHIFT: ${dominantTeam === score.team_a ? score.team_b : score.team_a} IS LOSING CONTROL`);
      }
    }
    const topBatter = score.batters.find(b => b.strikeRate > 180);
    if (topBatter) bulletins.push(`🔥 ON FIRE: ${topBatter.name} STRIKE RATE AT ${topBatter.strikeRate.toFixed(0)}`);
    if (score.status_text) bulletins.push(`📡 BROADCAST: ${score.status_text.toUpperCase()}`);
    bulletins.push(`🌟 GLOBAL HYPE: ${((score.win_prob_a + score.win_prob_b) * 1000).toFixed(0)} AGGREGATED VOTES`);
    return bulletins;
  }, [score]);

  return (
    <div className="bg-[#05070A] p-2 border-t border-white/5 overflow-hidden whitespace-nowrap relative">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#05070A] to-transparent z-10" />
      <div className="inline-block animate-scroll marquee text-[10px] font-black text-[#7A3FE1] tracking-widest uppercase italic py-1">
        {narrativeBulletins.join(" | ")}
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#05070A] to-transparent z-10" />
      <style jsx>{`
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
        .marquee { animation: scroll 40s linear infinite; padding-left: 100%; display: inline-block; }
      `}</style>
    </div>
  );
});
PredictionTicker.displayName = 'PredictionTicker';

const ActiveBowler = React.memo(({ bowler, isStreamLayout }: { bowler: any, isStreamLayout?: boolean }) => (
  <div className={`bg-[#05070A]/80 border-t border-white/5 ${isStreamLayout ? 'p-4' : 'p-3'} flex justify-between items-center group relative overflow-hidden`}>
    {isStreamLayout && (
       <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF3366]" />
    )}
    <div className="flex flex-col">
       <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">BALLING NOW</span>
       <span className={`${isStreamLayout ? 'text-lg' : 'text-xs'} font-black italic text-[#FF3366] uppercase leading-none`}>{bowler.name}</span>
       {isStreamLayout && <span className="text-[6px] font-black text-white/20 uppercase mt-1">Attack Vector: Spin</span>}
    </div>
    <div className="flex gap-6">
       <div className="flex flex-col items-end">
          <span className="text-[8px] text-gray-600 uppercase font-black">Overs</span>
          <span className={`${isStreamLayout ? 'text-xl' : 'text-xs'} font-bold text-white`}>{bowler.overs}</span>
       </div>
       <div className="flex flex-col items-end">
          <span className="text-[8px] text-gray-600 uppercase font-black">Figures</span>
          <span className={`${isStreamLayout ? 'text-xl' : 'text-xs'} font-bold text-[#FFD700]`}>{bowler.wickets}-{bowler.runs}</span>
       </div>
    </div>
  </div>
));
ActiveBowler.displayName = 'ActiveBowler';

export const Scoreboard = React.memo(({ matchId, isStreamLayout = false }: { matchId: string, isStreamLayout?: boolean }) => {
  const { score } = useMatchData();
  const fallbackScore: MatchScore = {
    match_id: matchId, team_a: 'TBA', team_b: 'TBA', score: '0/0', overs: '0.0', crr: 0,
    win_prob_a: 0.5, win_prob_b: 0.5, batters: [], bowlers: [], last_balls: [], is_second_innings: false,
    timestamp: new Date().toISOString()
  };
  const currentScore = score || fallbackScore;

  return (
    <div className={`flex flex-col w-full shadow-2xl skew-x-[-2deg] hover:skew-x-0 transition-transform duration-500 ${isStreamLayout ? 'max-w-[550px]' : 'max-w-md'}`}>
      <TeamStats score={currentScore} />
      
      {/* Stream-Specific Projected Finish */}
      {isStreamLayout && (
        <div className="bg-[#05070A] border-l-4 border-blue-500 p-3 mb-px flex justify-between items-center group overflow-hidden relative">
           <div className="absolute inset-0 bg-blue-500/5 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
           <div className="flex flex-col h-full justify-center">
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] italic">Projected Trajectory</span>
              <span className="text-xs font-black text-white italic">AI ESTIMATING FINAL RUNS @ {currentScore.crr?.toFixed(1)} CRR</span>
           </div>
           <div className="text-right">
              <span className="text-2xl font-black italic text-white tabular-nums drop-shadow-[0_0_10px_rgba(0,180,255,0.3)]">
                  {Math.round((currentScore.crr || 0) * 20)}
              </span>
           </div>
        </div>
      )}

      {currentScore.batters.length > 0 && (
        <div className={`grid ${isStreamLayout ? 'grid-cols-1 shadow-[0_0_30px_rgba(0,0,0,0.5)]' : 'grid-cols-2'} gap-px bg-white/5 border border-white/5`}>
          {currentScore.batters.map((batter, idx) => (
            <ActiveBatter key={`${batter.name}-${idx}`} batter={batter} matchId={matchId} isStreamLayout={isStreamLayout} />
          ))}
        </div>
      )}

      {currentScore.bowlers.length > 0 && (
        <div className={isStreamLayout ? 'mt-px border border-white/5' : ''}>
          <ActiveBowler bowler={currentScore.bowlers[0]} isStreamLayout={isStreamLayout} />
        </div>
      )}

      <PredictionTicker score={currentScore} />
    </div>
  );
});

Scoreboard.displayName = 'Scoreboard';

export default Scoreboard;
