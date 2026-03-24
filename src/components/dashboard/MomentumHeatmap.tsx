'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useCricketRealtime } from '../../hooks/useCricketRealtime';

interface MomentumHeatmapProps {
  matchId: string;
}

/**
 * PROJECT CRICKET PULSE - MOMENTUM HEATMAP
 * 
 * Renders a fluid SVG wave graph representing Win Probability.
 * Includes a boundary 'Explosion' VFX trigger synchronized with delay offset.
 */
const MomentumHeatmap: React.FC<MomentumHeatmapProps> = React.memo(({ matchId }) => {
  const { score, trigger } = useCricketRealtime(matchId);
  const [history, setHistory] = useState<number[]>(Array(20).fill(0));

  // Update history when win probability changes
  useEffect(() => {
    if (score) {
      const currentProb = (score.win_prob_a - 0.5) * 2; // Normalize to -1 to 1
      setHistory(prev => [...prev.slice(1), currentProb]);
    }
  }, [score]);

  // Visual 'Explosion' effect for boundaries
  useEffect(() => {
    if (trigger === 'BOUNDARY_FOUR' || trigger === 'BOUNDARY_SIX' || trigger === 'WICKET') {
      const colors = trigger === 'WICKET' ? ['#7A3FE1', '#0B0E14'] : ['#FFD700', '#FF3366'];
      
      confetti({
        particleCount: trigger === 'BOUNDARY_SIX' ? 200 : 100,
        spread: 90,
        origin: { y: 0.7 },
        colors: colors,
        ticks: 200,
        gravity: 1.2,
        scalar: 1.2,
        shapes: ['circle', 'square'],
      });
    }
  }, [trigger]);

  // SVG Path generation with smooth cubic interpolation (simulated with Framer Motion)
  const path = useMemo(() => {
    const stepX = 100 / (history.length - 1);
    const midY = 50;
    const scaleY = 40;

    return history.map((val, i) => {
      const x = i * stepX;
      const y = midY - (val * scaleY);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [history]);

  return (
    <div className="relative w-full h-48 bg-[#0B0E14] border border-white/5 overflow-hidden select-none">
      {/* Dynamic Header */}
      <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
        <h3 className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase mb-1">Win Probability Wave</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7A3FE1]" />
            <span className="text-[9px] font-bold text-gray-400">TEAM A {score ? Math.round((score.win_prob_a || 0.5) * 100) : 50}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF3366]" />
            <span className="text-[9px] font-bold text-gray-400">TEAM B {score ? Math.round((score.win_prob_b || 0.5) * 100) : 50}%</span>
          </div>
        </div>
      </div>

      {/* SVG Wave Graph */}
      <div className="absolute inset-0 top-8">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full opacity-80">
          <defs>
            <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7A3FE1" />
              <stop offset="50%" stopColor="#7A3FE1" stopOpacity="0" />
              <stop offset="100%" stopColor="#FF3366" />
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Baseline */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="1,1" />

          {/* Liquid Path */}
          <motion.path
            d={path}
            fill="none"
            stroke="url(#waveGradient)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            filter="url(#glow)"
            animate={{ d: path }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          />
          
          {/* Animated Area under the curve */}
          <motion.path
            d={`${path} L 100 50 L 0 50 Z`}
            fill="url(#waveGradient)"
            className="opacity-10"
            animate={{ d: `${path} L 100 50 L 0 50 Z` }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          />

          {/* Momentum Pips */}
          {history.map((val, i) => (
            i === history.length - 1 && (
              <motion.circle
                key="pip"
                cx={i * (100 / (history.length - 1))}
                cy={50 - (val * 40)}
                r="1.5"
                fill="#FFD700"
                filter="url(#glow)"
                animate={{ cx: i * (100 / (history.length - 1)), cy: 50 - (val * 40) }}
              />
            )
          ))}
        </svg>
      </div>

      {/* VFX Overlay Layer for Explosions */}
      <AnimatePresence>
        {trigger && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
               <div className={`text-4xl font-black italic tracking-tighter mix-blend-overlay opacity-30 ${trigger === 'WICKET' ? 'text-white' : 'text-[#FFD700]'}`}>
                  {trigger.split('_')[1] || trigger}
               </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

MomentumHeatmap.displayName = 'MomentumHeatmap';

export default MomentumHeatmap;
