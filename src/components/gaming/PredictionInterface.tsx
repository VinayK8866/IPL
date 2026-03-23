'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePredictionStore } from '../../lib/hooks/usePredictionStore';
import { global_match_delay_offset } from '../../hooks/useCricketRealtime';
import confetti from 'canvas-confetti';

/**
 * PROJECT CRICKET PULSE - PREDICTION INTERFACE
 * 
 * High-adrenaline betting module for "Fan-Coins".
 * Aesthetic: Cyber-Sport (Deep Navy, Neon Gradients, Aggressive Skews).
 * Logic: Atomic server-side balance updates with ball-index locking.
 */

interface PredictionInterfaceProps {
  userId: string;
  matchId: string;
}

const OUTCOMES = [
  { id: '6', label: 'SIX', color: '#FFD700', bg: 'bg-[#FFD700]' },
  { id: '4', label: 'FOUR', color: '#7A3FE1', bg: 'bg-[#7A3FE1]' },
  { id: 'wicket', label: 'WICKET', color: '#FF3366', bg: 'bg-[#FF3366]' },
  { id: 'dot', label: 'DOT', color: '#00F0FF', bg: 'bg-[#00F0FF]' },
  { id: 'other', label: 'OTHER', color: '#FFFFFF', bg: 'bg-white/20' }
] as const;

export const PredictionInterface: React.FC<PredictionInterfaceProps> = ({ userId, matchId }) => {
  const { balance, activeBallIndex, placeBet, isSyncing } = usePredictionStore(userId, matchId);
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [lastWin, setLastWin] = useState<number | null>(null);

  // Sync Logic: Ensure betting is for the NEXT ball (server controlled)
  const targetBallIndex = activeBallIndex + 1;

  const handlePrediction = async (type: any) => {
    try {
      await placeBet({
        type,
        amount: selectedAmount,
        ball_index: targetBallIndex
      });
      // Visual feedback for placing bet
    } catch (err: any) {
      alert(err.message || "Failed to place bet.");
    }
  };

  // Winning Feedback Trigger
  useEffect(() => {
    // This would ideally listen to a specific 'won' event from Supabase Realtime
    // For now, we simulate success for demo effects if balance jumps
  }, [balance]);

  return (
    <div className="w-full bg-[#0B0E14] border-l-4 border-[#7A3FE1] p-6 shadow-2xl relative overflow-hidden group">
      
      {/* Adrenaline Ticker Header */}
      <div className="flex justify-between items-end mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-[#7A3FE1] tracking-[0.4em] uppercase mb-1">Fan-Coin Wallet</span>
          <div className="flex items-baseline gap-2">
            <motion.span 
              key={balance}
              initial={{ scale: 1.2, color: '#FFD700' }}
              animate={{ scale: 1, color: '#FFFFFF' }}
              className="text-4xl font-black italic tracking-tighter"
            >
              {balance.toLocaleString()}
            </motion.span>
            <span className="text-xs font-bold text-gray-500 uppercase">FC</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Next Ball Lock</span>
          <span className="text-sm font-black italic text-white bg-[#1A1F29] px-2 py-1 skew-x-[-10deg]">
             BALL INDEX {targetBallIndex}
          </span>
        </div>
      </div>

      {/* Stake Selection */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[50, 100, 250, 500].map((amt) => (
          <button
            key={amt}
            onClick={() => setSelectedAmount(amt)}
            className={`py-2 text-xs font-black italic border-b-2 transition-all 
              ${selectedAmount === amt ? 'bg-[#7A3FE1] border-[#FFD700] text-white' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'}
            `}
          >
            {amt} FC
          </button>
        ))}
      </div>

      {/* Outcome Grid */}
      <div className="grid grid-cols-5 gap-2">
        {OUTCOMES.map((outcome) => (
          <motion.button
            key={outcome.id}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            disabled={isSyncing}
            onClick={() => handlePrediction(outcome.id)}
            className="flex flex-col items-center gap-2 group/btn"
          >
            <div className={`w-full aspect-square flex items-center justify-center relative overflow-hidden transition-all duration-300
              ${isSyncing ? 'opacity-50 grayscale' : 'opacity-100'}
            `}>
              {/* Animated Glow Border */}
              <div className={`absolute inset-0 ${outcome.bg} opacity-20 group-hover/btn:opacity-40`} />
              <div className={`absolute inset-[1px] bg-[#05070B]`} />
              
              <span className="relative z-10 text-xs font-black italic" style={{ color: outcome.color }}>
                {outcome.label}
              </span>
            </div>
            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Bet</span>
          </motion.button>
        ))}
      </div>

      {/* Match Delay Overlay Sync UI */}
      <div className="mt-6 flex items-center justify-center gap-4 bg-white/5 p-2 skew-x-[-5deg]">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
          Sync Active: Lag Override {global_match_delay_offset.value}s
        </span>
      </div>

      {/* Cyber-VFX Background Accents */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-[#7A3FE1]/10 to-transparent pointer-events-none opacity-50" />
      
      <style jsx>{`
         .bg-gradient-radial {
           background: radial-gradient(circle, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 70%);
         }
      `}</style>
    </div>
  );
};
