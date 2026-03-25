'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCricketRealtime } from '../../hooks/useCricketRealtime';

/**
 * PROJECT CRICKET PULSE - PERFORMANCE CLUSTERS
 * 
 * Heatmap-style visualization of player success zones.
 * Aesthetic: Cyber-Sport (Hexagonal Grids, Neon Glow).
 */

interface PerformanceClustersProps {
  matchId: string;
}

export const PerformanceClusters = React.memo(({ matchId }: PerformanceClustersProps) => {
  const { score } = useCricketRealtime(matchId);

  return (
    <div className="w-full h-full bg-[#0B0E14] border border-white/5 p-4 relative overflow-hidden flex flex-col group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Performance Clusters</h4>
          <span className="text-[8px] font-bold text-[#FF3366] uppercase italic">In-Depth Zone Analysis</span>
        </div>
        <div className="px-2 py-0.5 bg-[#FF3366]/10 border border-[#FF3366]/20 skew-x-[-10deg]">
            <span className="text-[8px] font-black text-[#FF3366]">BETA_V3</span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-6 grid-rows-4 gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        {Array.from({ length: 24 }).map((_, i) => {
          const intensity = Math.random(); // Placeholder for real cluster data
          const color = intensity > 0.7 ? '#FF3366' : (intensity > 0.4 ? '#7A3FE1' : '#1A1F29');
          
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="relative border border-white/5 clip-hex"
              style={{ backgroundColor: color, opacity: 0.1 + intensity * 0.9 }}
            >
              {intensity > 0.8 && (
                <div className="absolute inset-0 bg-white/20 animate-pulse " />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between items-center px-1">
         <div className="flex gap-2 items-center">
            <div className="w-2 h-2 bg-[#FF3366]" />
            <span className="text-[8px] font-bold text-gray-600 uppercase">Impact Zone</span>
         </div>
         <span className="text-[9px] font-black text-white italic">MATCH_STABILITY: 0.74</span>
      </div>

      <style jsx>{`
        .clip-hex {
          clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
        }
      `}</style>
    </div>
  );
});

PerformanceClusters.displayName = 'PerformanceClusters';
