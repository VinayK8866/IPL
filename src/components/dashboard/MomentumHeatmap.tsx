'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCricketRealtime } from '../../hooks/useCricketRealtime';
import { useVFX } from './vfx/VFXProvider';
import { useLatencyRef } from '../../providers/LatencyProvider';

/**
 * PROJECT CRICKET PULSE - MOMENTUM HEATMAP
 * 
 * A high-performance, real-time SVG wave graph visualizing 'Win Probability'.
 * Features:
 * - Fluid SVG path transitions using Framer Motion.
 * - Synchronized boundary explosions triggered via useCricketRealtime.
 * - "Cyber-Sport" aesthetic with Deep Navy (#0B0E14) and high-contrast gradients.
 * - Player "On-Fire" state for strike rates > 200.
 */

interface ProbabilityPoint {
  probA: number;
  probB: number;
  timestamp: number;
}

const MAX_POINTS = 30;

export const MomentumHeatmap = React.memo(({ matchId }: { matchId: string }) => {
  const { score, trigger } = useCricketRealtime(matchId);
  const { triggerExplosion } = useVFX();
  const getOffset = useLatencyRef();
  
  const [history, setHistory] = useState<ProbabilityPoint[]>([]);
  const lastProcessedTrigger = useRef<string | null>(null);

  // Update history when score changes
  useEffect(() => {
    if (!score) return;

    setHistory(prev => {
      const newPoint: ProbabilityPoint = {
        probA: score.win_prob_a,
        probB: score.win_prob_b,
        timestamp: Date.now()
      };

      // Deduplicate if needed (though score timestamp changed)
      if (prev.length > 0 && prev[prev.length - 1].probA === newPoint.probA && prev[prev.length - 1].probB === newPoint.probB) {
         return prev;
      }

      const updated = [...prev, newPoint];
      if (updated.length > MAX_POINTS) {
        return updated.slice(updated.length - MAX_POINTS);
      }
      return updated;
    });
  }, [score]);

  // Handle boundary explosions
  useEffect(() => {
    if (!trigger) {
      lastProcessedTrigger.current = null;
      return;
    }
    if (trigger === lastProcessedTrigger.current) return;

    if (trigger === 'BOUNDARY_FOUR' || trigger === 'BOUNDARY_SIX' || trigger === 'WICKET') {
      const type = trigger === 'BOUNDARY_SIX' ? 'six' : (trigger === 'BOUNDARY_FOUR' ? 'four' : 'wicket');
      
      // We know data is already delayed by match_delay_offset in useCricketRealtime.
      // To trigger the visual effect NOW (which is already delayed), we pass the back-dated eventTime.
      const offset = getOffset();
      const eventTime = Date.now() - (offset * 1000);
      
      // Determine team color based on which team had the event (simplified to current leader for now, 
      // or we could check which team is batting if we had that info more clearly here)
      // For now, let's use the team that currently has higher probability as a proxy, 
      // or just a default accent if unsure.
      const teamColor = score && score.win_prob_a > 0.5 ? '#7A3FE1' : '#FF3366';
      
      triggerExplosion(type, teamColor, eventTime);
      lastProcessedTrigger.current = trigger;
    }
  }, [trigger, triggerExplosion, getOffset, score]);

  // Generate SVG Path
  const svgContent = useMemo(() => {
    if (history.length < 2) return null;

    const width = 400;
    const height = 150;
    const padding = 10;
    const innerWidth = width - (padding * 2);
    const innerHeight = height - (padding * 2);

    const getX = (index: number) => padding + (index / (MAX_POINTS - 1)) * innerWidth;
    const getY = (prob: number) => padding + (1 - prob) * innerHeight;

    // Create paths for Team A and Team B probabilities
    // We visualize it as a divergent area graph around the 50% line
    const pointsA = history.map((p, i) => `${getX(i)},${getY(p.probA)}`).join(' ');
    const pointsB = history.map((p, i) => `${getX(i)},${getY(p.probB)}`).join(' ');

    // Smooth path using cubic bezier (simplified)
    const generateSmoothPath = (pts: ProbabilityPoint[], key: 'probA' | 'probB') => {
      if (pts.length < 2) return '';
      let d = `M ${getX(0)} ${getY(pts[0][key])}`;
      for (let i = 1; i < pts.length; i++) {
        const x1 = getX(i - 1 + 0.5);
        const y1 = getY(pts[i - 1][key]);
        const x2 = getX(i - 0.5);
        const y2 = getY(pts[i][key]);
        const x = getX(i);
        const y = getY(pts[i][key]);
        d += ` C ${x1} ${y1}, ${x2} ${y2}, ${x} ${y}`;
      }
      return d;
    };

    const pathA = generateSmoothPath(history, 'probA');
    const pathB = generateSmoothPath(history, 'probB');

    return { pathA, pathB, width, height, padding, innerWidth, innerHeight };
  }, [history]);

  // Check for players on fire
  const onFirePlayers = useMemo(() => {
    if (!score) return [];
    return score.batters.filter(b => b.strikeRate >= 200 && b.balls >= 10);
  }, [score]);

  return (
    <div className="w-full bg-[#0B0E14] border border-white/5 p-6 relative overflow-hidden group select-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <h3 className="text-[10px] font-black text-[#7A3FE1] tracking-[0.3em] uppercase mb-1">Momentum Heatmap</h3>
          <span className="text-[9px] font-bold text-gray-500 italic">Win Probability Oscillations | Real-Time</span>
        </div>
        {onFirePlayers.length > 0 && (
          <div className="flex gap-2">
            {onFirePlayers.map(p => (
              <span key={p.name} className="text-[8px] font-black bg-[#FF3366] px-2 py-0.5 text-white animate-pulse uppercase">
                {p.name} 🔥
              </span>
            ))}
          </div>
        )}
      </div>

      {/* SVG Graph */}
      <div className="relative h-[150px] w-full">
        <AnimatePresence>
          {svgContent && (
            <motion.svg
              viewBox={`0 0 ${svgContent.width} ${svgContent.height}`}
              className="w-full h-full overflow-visible"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <defs>
                <linearGradient id="gradA" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#7A3FE1" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#7A3FE1" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gradB" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#FF3366" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#FF3366" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* 50% Baseline */}
              <line 
                x1={svgContent.padding} 
                y1={svgContent.height / 2} 
                x2={svgContent.width - svgContent.padding} 
                y2={svgContent.height / 2} 
                stroke="rgba(255,255,255,0.1)" 
                strokeWidth="1" 
                strokeDasharray="4 4"
              />

              {/* Paths */}
              <motion.path
                d={svgContent.pathA}
                fill="none"
                stroke="#7A3FE1"
                strokeWidth="3"
                initial={false}
                animate={{ d: svgContent.pathA }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                style={{ filter: 'drop-shadow(0 0 8px #7A3FE1)' }}
              />
              <motion.path
                d={svgContent.pathB}
                fill="none"
                stroke="#FF3366"
                strokeWidth="3"
                initial={false}
                animate={{ d: svgContent.pathB }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                style={{ filter: 'drop-shadow(0 0 8px #FF3366)' }}
              />

              {/* Area Graphs (Optional but adds to 'Heatmap' feel) */}
              <motion.path
                d={`${svgContent.pathA} V ${svgContent.height / 2} H ${svgContent.padding} Z`}
                fill="url(#gradA)"
                initial={false}
                animate={{ d: `${svgContent.pathA} V ${svgContent.height / 2} H ${svgContent.padding} Z` }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      {/* On-Fire Visualization Overlay */}
      {onFirePlayers.length > 0 && (
         <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
            <div className="fire-sprite-overlay absolute bottom-0 left-0 w-full h-full" />
         </div>
      )}

      {/* Cyber-Sport Accents */}
      <div className="absolute bottom-0 right-0 p-2 opacity-30">
        <div className="w-16 h-1 w-full bg-gradient-to-r from-transparent via-[#7A3FE1] to-[#FF3366] skew-x-[-20deg]" />
      </div>

      <style jsx>{`
        .fire-sprite-overlay {
          background: linear-gradient(0deg, #FF3366 0%, transparent 60%);
          mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0) 80%);
          animation: fire-rise 0.8s steps(4) infinite;
        }
        @keyframes fire-rise {
          0% { transform: translateY(10%) scaleY(1); opacity: 0.3; }
          50% { transform: translateY(0%) scaleY(1.2); opacity: 0.6; }
          100% { transform: translateY(10%) scaleY(1); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
});

MomentumHeatmap.displayName = 'MomentumHeatmap';

export default MomentumHeatmap;
