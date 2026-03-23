'use client';

import React, { useMemo } from 'react';
import { useCricketRealtime } from '../../hooks/useCricketRealtime';

interface RealtimeStatusProps {
  matchId: string;
}

/**
 * PROJECT CRICKET PULSE - REALTIME STATUS COMPONENT
 * 
 * High-adrenaline connection status indicator.
 * Matches Cyber-Sport palette (Deep Navy, Gold, Neon Pink).
 */
export function RealtimeStatus({ matchId }: RealtimeStatusProps) {
  const { isConnected, momentum, hype } = useCricketRealtime(matchId);

  // Memoize to prevent jitter in heavy dashboard layouts
  const statusUi = useMemo(() => {
    return (
      <div className="flex items-center gap-4 bg-[#0B0E14] border-l-4 border-[#FF10F0] p-3 shadow-[0_0_15px_rgba(255,16,240,0.3)] select-none">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
            Data Stream
          </span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse ring-2 ring-green-400/50' : 'bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.8)]'}`} />
            <span className={`text-sm font-black italic tracking-tighter ${isConnected ? 'text-white' : 'text-gray-500'}`}>
              {isConnected ? 'LIVE SYNCED' : 'RECONNECTING...'}
            </span>
          </div>
        </div>

        {isConnected && (
          <div className="flex gap-4 ml-auto border-l border-white/10 pl-4 items-center">
            {/* Momentum Indicator */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Momentum</span>
              <span className="text-[#FFD700] font-black text-xs italic">
                {momentum?.momentum_score.toFixed(1) || '0.0'}
              </span>
            </div>

            {/* Hype/Coin Indicator (Sub-second updates) */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Hype Meter</span>
              <span className="text-[#FF10F0] font-black text-xs italic">
                {hype ? (hype.team_a_clicks + hype.team_b_clicks).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }, [isConnected, momentum, hype]);

  return statusUi;
}
