'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCricketRealtime } from '../../hooks/useCricketRealtime';
import { BallData } from '../../lib/data-engine/types';

/**
 * PROJECT CRICKET PULSE - WAGON WHEEL PROJECTION
 * 
 * Visualizes the 360-degree distribution of shots.
 * Aesthetic: Cyber-Sport (Neon Gradients, Radial Grid, Glowing Nodes).
 */

interface WagonWheelProps {
  matchId: string;
}

export const WagonWheel = React.memo(({ matchId }: WagonWheelProps) => {
  const { score } = useCricketRealtime(matchId);
  
  // Simulation: Map x,y coordinates to radial points
  // In a real feed, we would have 'angle' and 'distance'. 
  // Here we derive it from ball.x (angle) and ball.y (distance) for the demo.
  const hits = useMemo(() => {
    if (!score?.last_balls) return [];
    return score.last_balls.map((ball, i) => {
      // JUGAAD: Use the parsed angle from commentary (stored in z)
      const angle = (ball.z as number) || 0;
      const distance = (ball.y * 50) + 40; // Scale distance for better visual spread
      const isBoundary = ball.y > 0.7;
      
      return {
        id: ball.timestamp + i,
        angle: angle - 90, // Adjust for SVG coordinates
        distance,
        color: ball.is_wicket ? '#FF3366' : (isBoundary ? '#FFD700' : '#7A3FE1'),
        size: isBoundary ? 6 : 4
      };
    });
  }, [score]);

  return (
    <div className="w-full h-full bg-[#0B0E14] border border-white/5 p-4 relative overflow-hidden flex flex-col items-center justify-center group">
      <div className="absolute top-3 left-4 flex flex-col pointer-events-none">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Wagon Wheel</h4>
        <span className="text-[8px] font-bold text-[#7A3FE1] uppercase">360° Hit Distribution</span>
      </div>

      <div className="relative w-40 h-40">
        {/* Radial Grid Shell */}
        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100">
          {/* Boundary Circle */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.1" strokeDasharray="2 2" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" />
          <circle cx="50" cy="50" r="15" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.05" />
          
          {/* Directional Spokes */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <line 
              key={deg}
              x1="50" y1="50" 
              x2={50 + 45 * Math.cos(deg * Math.PI / 180)} 
              y2={50 + 45 * Math.sin(deg * Math.PI / 180)} 
              stroke="white" strokeWidth="0.2" strokeOpacity="0.1" 
            />
          ))}

          {/* Data Points (Hits) */}
          {hits.map((hit) => {
            const rad = (hit.angle - 90) * Math.PI / 180;
            const cx = 50 + hit.distance * Math.cos(rad) * 0.45;
            const cy = 50 + hit.distance * Math.sin(rad) * 0.45;
            
            return (
              <g key={hit.id}>
                {/* Connection Line to Center */}
                <motion.line 
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.2 }}
                  x1="50" y1="50" x2={cx} y2={cy} 
                  stroke={hit.color} strokeWidth="0.5" 
                />
                {/* Hit Node */}
                <motion.circle 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  cx={cx} cy={cy} r={hit.size / 2} 
                  fill={hit.color} 
                  filter="drop-shadow(0 0 4px currentColor)"
                />
              </g>
            );
          })}
        </svg>

        {/* Center Pitch Indicator */}
        <div className="absolute inset-[42%] bg-white/5 border border-white/10 skew-x-[-10deg] flex items-center justify-center">
            <div className="w-1 h-2 bg-[#FFD700]/40" />
        </div>
      </div>

      {/* Stats Overlay */}
      <div className="absolute bottom-3 right-4 text-right">
          <span className="text-[8px] font-black text-gray-600 uppercase">Boundary Precision</span>
          <div className="text-xs font-black italic text-white leading-none">82%</div>
      </div>
    </div>
  );
});

WagonWheel.displayName = 'WagonWheel';
