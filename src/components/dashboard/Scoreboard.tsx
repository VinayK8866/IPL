'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Batter, MatchScore } from '@/lib/data-engine/types';
import { usePlayerFireState } from '@/hooks/usePlayerFireState';
import { PlayerFireVFX } from './PlayerFireVFX';
import { useMatchData } from '@/providers/MatchDataProvider';

/**
 * PROJECT CRICKET PULSE - CORE SCOREBOARD
 * 
 * High-performance, real-time scoreboard with "On-Fire" transitions.
 */

const Counter = React.memo(({ value, className }: { value: string | number; className?: string }) => (
  <AnimatePresence mode="popLayout" initial={false}>
    <motion.span
      key={`${value}`}
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

const BallBubble = React.memo(({ value, isWicket }: { value: string | number; isWicket?: boolean }) => {
  const isBoundary = value === '4' || value === '6';
  const bgColor = isWicket ? 'bg-[#FF3366]' : isBoundary ? 'bg-[#FFD700]' : 'bg-[#1A1F29]';
  const textColor = isBoundary || isWicket ? 'text-black' : 'text-white';

  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${bgColor} ${textColor} shadow-lg shrink-0 border border-white/10`}>
      {value}
    </div>
  );
});
BallBubble.displayName = 'BallBubble';

const ActiveBatter = React.memo(({ batter, matchId, isStreamLayout }: { batter: Batter; matchId: string; isStreamLayout?: boolean }) => {
  const { isGlowing, intensity } = usePlayerFireState(batter.name, matchId);

  return (
    <PlayerFireVFX isGlowing={isGlowing} intensity={intensity}>
      <div className={`relative ${isStreamLayout ? 'p-6' : 'p-4'} bg-[#1A1F29]/95 border-l-4 ${isGlowing ? 'border-[#FF3366]' : 'border-[#7A3FE1]'} overflow-hidden h-full`}>
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className={`font-black italic ${isStreamLayout ? 'text-xl' : 'text-[11px]'} tracking-tighter text-white uppercase truncate max-w-[150px]`}>
                {batter.name}
              </span>
              {isStreamLayout && (
                <span className="text-[8px] font-black text-[#7A3FE1] uppercase tracking-[0.4em]">STRIKER MODUS</span>
              )}
            </div>
            {isGlowing && (
              <motion.span 
                animate={{ scale: [1, 1.1, 1], rotate: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-[9px] font-black bg-[#FF3366] px-3 py-1 text-white shadow-[0_0_20px_#FF3366]"
              >
                ON FIRE
              </motion.span>
            )}
          </div>
          <div className="flex justify-between items-end">
            <div className="flex items-baseline gap-2">
              <Counter value={batter.runs} className={`${isStreamLayout ? 'text-5xl' : 'text-2xl'} font-black text-[#FFD700] tabular-nums tracking-tighter`} />
              <span className={`${isStreamLayout ? 'text-lg' : 'text-[10px]'} text-gray-600 font-bold`}>({batter.balls})</span>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex gap-3 mb-1">
                 <div className="flex flex-col items-center">
                    <span className="text-[7px] text-gray-500 font-black uppercase">4s</span>
                    <span className="text-xs font-bold text-white leading-none">{batter.fours || 0}</span>
                 </div>
                 <div className="flex flex-col items-center">
                    <span className="text-[7px] text-gray-500 font-black uppercase">6s</span>
                    <span className="text-xs font-bold text-[#FFD700] leading-none">{batter.sixes || 0}</span>
                 </div>
              </div>
              <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest leading-none">Strike Rate</span>
              <span className={`${isStreamLayout ? 'text-2xl' : 'text-xs'} font-black italic ${isGlowing ? 'text-[#FF3366]' : 'text-white'} leading-none mt-1`}>
                {(batter.strikeRate || 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PlayerFireVFX>
  );
});
ActiveBatter.displayName = 'ActiveBatter';

const TeamStats = React.memo(({ score, isStreamLayout }: { score: MatchScore; isStreamLayout?: boolean }) => {
  const currentRuns = useMemo(() => {
    if (!score.score) return 0;
    const parts = score.score.split('/');
    return parseInt(parts[0]) || 0;
  }, [score.score]);

  const remainingRuns = score.target ? score.target - currentRuns : null;
  const oversDone = typeof score.overs === 'string' ? parseFloat(score.overs) : (score.overs || 0);
  const ballsPlayed = Math.floor(oversDone) * 6 + Math.round((oversDone % 1) * 10);
  const totalBalls = (score.over_limit || 20) * 6;
  const remainingBalls = Math.max(0, totalBalls - ballsPlayed);

  return (
    <div className="flex flex-col bg-[#0B0E14] border border-white/5 relative overflow-hidden shadow-2xl">
      {score.is_second_innings && remainingRuns !== null && (
        <div className="bg-[#FFD700] p-2 flex justify-center items-center overflow-hidden relative">
           <div className="absolute inset-0 bg-black/10 animate-pulse" />
           <span className="text-[14px] font-black italic text-black uppercase tracking-tighter z-10">
              {score.team_a || 'TBA'} NEED <span className="text-[20px] mx-1">{remainingRuns}</span> RUNS IN <span className="text-[20px] mx-1">{remainingBalls}</span> BALLS
           </span>
        </div>
      )}
      <div className="p-6 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-[#7A3FE1] tracking-[0.2em] uppercase mb-1">
              {score.status_text && score.status_text.includes('Live') ? 'LIVE STATS' : score.status_text || 'MATCH BOARD'}
            </span>
            <div className="flex items-baseline gap-3">
              <Counter value={(score.score === '0/0' && score.status_text) ? 'LIVE' : (score.score || '0/0')} className={`${isStreamLayout ? 'text-7xl' : 'text-5xl'} font-black italic tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]`} />
              <div className="flex flex-col">
                <span className={`${isStreamLayout ? 'text-xl' : 'text-sm'} font-black text-gray-400`}>({score.overs || '0.0'})</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 ml-4">
            <span className="text-[12px] font-black text-[#FFD700] uppercase tracking-widest text-right">{score.team_a || 'TBA'} vs {score.team_b || 'TBA'}</span>
            <div className="mt-4 flex gap-6 text-right">
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-gray-500 font-black uppercase tracking-tighter">CRR</span>
                <span className="text-xl font-black italic text-white leading-none mt-1">{(score.crr || 0).toFixed(2)}</span>
              </div>
              {score.is_second_innings && score.rrr && (
                <div className="flex flex-col items-end">
                  <span className="text-[8px] text-gray-500 font-black uppercase tracking-tighter">RRR</span>
                  <span className="text-xl font-black italic text-[#FF3366] leading-none mt-1">{score.rrr}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[#05070A] p-2 border border-white/5 skew-x-[-10deg]">
           <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] transform skew-x-[10deg] ml-2">Recent Ball Timeline</span>
           <div className="flex gap-1.5 transform skew-x-[10deg] overflow-x-auto no-scrollbar">
              {(() => {
                const oversFloat = parseFloat(score.overs || '0');
                const currentOverWhole = Math.floor(oversFloat);
                const currentBalls = (score.last_balls || []).filter(ball => {
                  const ballOver = parseFloat(ball.over || '0');
                  return Math.floor(ballOver) === currentOverWhole;
                });
                
                if (currentBalls.length > 0) {
                  return currentBalls.map((ball, idx) => (
                    <BallBubble key={`${idx}-${ball.timestamp}`} value={ball.is_wicket ? 'W' : ball.value || '0'} isWicket={ball.is_wicket} />
                  ));
                }
                
                return [...Array(6)].map((_, i) => <BallBubble key={i} value="-" />);
              })()}
           </div>
        </div>
      </div>
    </div>
  );
});
TeamStats.displayName = 'TeamStats';

const PredictionTicker = React.memo(({ score }: { score: MatchScore }) => {
  const narrativeBulletins = useMemo(() => {
    if (!score) return ["INITIALIZING NEURAL ANALYSIS...", "SYNCING LIVE FEED..."];
    const bulletins = [];
    const dominantTeam = score.win_prob_a > score.win_prob_b ? score.team_a : score.team_b;
    const prob = Math.max(score.win_prob_a, score.win_prob_b) * 100;
    bulletins.push(`⚡ AI PREDICTION: ${dominantTeam || 'TBA'} WIN CHANCE ${prob.toFixed(0)}%`);
    if (score.is_second_innings && score.rrr) {
      bulletins.push(`🏹 TARGET CRITICAL: REQUIRES ${score.rrr} RUNS PER OVER`);
      if (score.win_prob_a < 0.3 || score.win_prob_b < 0.3) {
        bulletins.push(`🚨 MOMENTUM SHIFT: ${dominantTeam === score.team_a ? score.team_b : score.team_a} IS LOSING CONTROL`);
      }
    }
    const topBatter = score.batters?.find(b => b.strikeRate > 180);
    if (topBatter) bulletins.push(`🔥 ON FIRE: ${topBatter.name} STRIKE RATE AT ${topBatter.strikeRate.toFixed(0)}`);
    if (score.status_text) bulletins.push(`📡 BROADCAST: ${score.status_text.toUpperCase()}`);
    bulletins.push(`🌟 GLOBAL HYPE: ${((score.win_prob_a + score.win_prob_b) * 1000).toFixed(0)} AGGREGATED VOTES`);
    return bulletins;
  }, [score]);

  return (
    <div className="bg-[#05070A] p-2 border-t border-white/5 overflow-hidden whitespace-nowrap relative">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#05070A] to-transparent z-10" />
      <div className="inline-block animate-marquee text-[10px] font-black text-[#7A3FE1] tracking-widest uppercase italic py-1">
        {narrativeBulletins.join(" | ")}
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#05070A] to-transparent z-10" />
    </div>
  );
});
PredictionTicker.displayName = 'PredictionTicker';

const ActiveBowler = React.memo(({ bowler, isStreamLayout }: { bowler: any, isStreamLayout?: boolean }) => {
  const oversDone = useMemo(() => {
    return typeof bowler.overs === 'string' ? parseFloat(bowler.overs) : (bowler.overs || 0);
  }, [bowler.overs]);
  
  const ballsBowled = Math.floor(oversDone) * 6 + Math.round((oversDone % 1) * 10);
  const econ = ballsBowled > 0 ? (bowler.runs / ballsBowled) * 6 : 0;

  return (
    <div className={`bg-[#05070A]/80 border-t border-white/5 ${isStreamLayout ? 'p-6' : 'p-3'} flex justify-between items-center group relative overflow-hidden`}>
      {isStreamLayout && (
         <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#FF3366]" />
      )}
      <div className="flex flex-col">
         <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">BALLING NOW</span>
         <span className={`${isStreamLayout ? 'text-3xl' : 'text-xs'} font-black italic text-[#FF3366] uppercase leading-none tracking-tighter`}>{bowler.name || 'TBA'}</span>
         {isStreamLayout && <span className="text-[10px] font-black text-white/20 uppercase mt-2">Attack Vector: HIGH INTENSITY PACE/SPIN</span>}
      </div>
      <div className="flex gap-8">
         <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-600 uppercase font-black">Overs</span>
            <span className={`${isStreamLayout ? 'text-3xl' : 'text-xs'} font-bold text-white tabular-nums`}>{bowler.overs || '0.0'}</span>
         </div>
         <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-600 uppercase font-black">Figures</span>
            <span className={`${isStreamLayout ? 'text-3xl' : 'text-xs'} font-bold text-[#FFD700] tabular-nums`}>{bowler.wickets || 0}-{bowler.runs || 0}</span>
         </div>
         {isStreamLayout && (
            <div className="flex flex-col items-end pr-4">
               <span className="text-[10px] text-gray-600 uppercase font-black">ECON</span>
               <span className="text-3xl font-bold text-white">{econ.toFixed(1)}</span>
            </div>
         )}
      </div>
    </div>
  );
});
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
    <div className={`flex flex-col w-full shadow-2xl skew-x-[-2deg] hover:skew-x-0 transition-transform duration-500 ${isStreamLayout ? 'max-w-[700px]' : 'max-w-md'}`}>
      <TeamStats score={currentScore} isStreamLayout={isStreamLayout} />
      {currentScore.batters && currentScore.batters.length > 0 && (
        <div className={`grid ${isStreamLayout ? 'grid-cols-1 shadow-[0_0_50px_rgba(0,0,0,1)]' : 'grid-cols-2'} gap-px bg-white/5 border border-white/5`}>
          {currentScore.batters.map((batter, idx) => (
            <ActiveBatter key={`${batter.name}-${idx}`} batter={batter} matchId={matchId} isStreamLayout={isStreamLayout} />
          ))}
        </div>
      )}
      {currentScore.bowlers && currentScore.bowlers.length > 0 && <ActiveBowler bowler={currentScore.bowlers[0]} isStreamLayout={isStreamLayout} />}
      <PredictionTicker score={currentScore} />
    </div>
  );
});

Scoreboard.displayName = 'Scoreboard';
export default Scoreboard;
