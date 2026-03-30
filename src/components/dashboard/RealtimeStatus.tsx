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
 * Shows API SYNCED when using serverless API polling (Vercel-compatible).
 */
export function RealtimeStatus({ matchId }: RealtimeStatusProps) {
  const { isConnected, momentum, hype, score } = useCricketRealtime(matchId);

  // Consider connected if we have score data (from API polling or socket)
  const hasData = isConnected || !!score;

  // Memoize to prevent jitter in heavy dashboard layouts
  const statusUi = useMemo(() => {
    return (
      <div className="flex items-center gap-4 bg-[#0B0E14] border-l-4 border-[#FF10F0] p-3 shadow-[0_0_15px_rgba(255,16,240,0.3)] select-none">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
            Data Stream
          </span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hasData ? 'bg-green-400 animate-pulse ring-2 ring-green-400/50' : 'bg-yellow-500 shadow-[0_0_8px_rgba(255,200,0,0.8)] animate-pulse'}`} />
            <span className={`text-sm font-black italic tracking-tighter ${hasData ? 'text-white' : 'text-gray-500'}`}>
              {hasData ? 'API SYNCED' : 'CONNECTING...'}
            </span>
          </div>
        </div>

        {hasData && (
          <div className="flex gap-4 ml-auto border-l border-white/10 pl-4 items-center">
            {/* Momentum Indicator */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Momentum</span>
              <span className="text-[#FFD700] font-black text-xs italic">
                {(momentum?.momentum_score || 0).toFixed(1)}
              </span>
            </div>

            {/* Hype/Coin Indicator */}
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
  }, [hasData, momentum, hype]);

  return statusUi;
}
