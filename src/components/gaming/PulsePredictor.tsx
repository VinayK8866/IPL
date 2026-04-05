'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Timer, Trophy } from 'lucide-react';
import { useMatchData } from '@/providers/MatchDataProvider';

/**
 * THE PULSE PREDICTOR
 * 
 * A gamified pop-up system designed to beat YouTube stream engagement.
 * Triggers interactive polls based on real-time match context.
 */

interface PredictionOption {
  id: string;
  label: string;
  odds: string;
}

export const PulsePredictor = () => {
  const { score } = useMatchData();
  const [activePoll, setActivePoll] = useState<{
    id: string;
    question: string;
    options: PredictionOption[];
    expiresAt: number;
  } | null>(null);
  
  const [votedId, setVotedId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Simulation: Trigger a poll every 2 overs or on high-leverage moments
  useEffect(() => {
    if (!score) return;
    
    const overs = parseFloat(score.overs);
    const isLevearageTime = (overs % 2 === 0 && overs > 0);
    
    if (isLevearageTime && !activePoll) {
      const isSecondInnings = score.is_second_innings;
      
      const poll = {
        id: `poll-${Date.now()}`,
        question: isSecondInnings 
          ? `Will the next over be MORE than ${score.rrr ? Math.floor(score.rrr) : 8} runs?`
          : `Will ${score.batters[0]?.name || 'the batter'} hit a SIX in the next 12 balls?`,
        options: [
          { id: 'yes', label: 'YES (HIGH HYPE)', odds: '2.5x' },
          { id: 'no', label: 'NO (SAFE BET)', odds: '1.2x' }
        ],
        expiresAt: Date.now() + 45000 // 45 second window
      };
      
      setActivePoll(poll);
      setVotedId(null);
      setShowResult(false);
    }
  }, [score, activePoll]);

  // Auto-hide poll
  useEffect(() => {
    if (activePoll && Date.now() > activePoll.expiresAt) {
      setActivePoll(null);
    }
    
    if (activePoll) {
      const timer = setTimeout(() => {
        setActivePoll(null);
      }, 50000);
      return () => clearTimeout(timer);
    }
  }, [activePoll]);

  const handleVote = (id: string) => {
    setVotedId(id);
    setShowResult(true);
    // In a real app, send to Supabase for global aggregation
    setTimeout(() => setActivePoll(null), 5000);
  };

  return (
    <AnimatePresence>
      {activePoll && (
        <motion.div 
          initial={{ x: -100, opacity: 0, scale: 0.8 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 100, opacity: 0, scale: 0.8 }}
          className="bg-[#0B0E14]/95 border-l-4 border-gold-500 shadow-[0_0_50px_rgba(255,215,0,0.2)] p-6 w-[400px] skew-x-[-5deg] relative overflow-hidden"
        >
          {/* Visual Accents */}
          <div className="absolute top-0 right-0 p-2 opacity-10">
             <Trophy size={80} className="text-gold-500" />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="p-1 bg-gold-500 rounded-sm">
               <Zap size={14} className="text-black fill-black" />
            </div>
            <span className="text-[10px] font-black italic text-gold-500 uppercase tracking-[0.3em]">
               PULSE PREDICTOR LIVE
            </span>
            <div className="ml-auto flex items-center gap-1">
               <Timer size={10} className="text-white/40" />
               <span className="text-[9px] font-bold text-white/40">CLOSING SOON</span>
            </div>
          </div>

          <h3 className="text-white font-black italic text-lg leading-tight uppercase mb-6">
            {activePoll.question}
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {activePoll.options.map((opt) => (
              <button
                key={opt.id}
                disabled={showResult}
                onClick={() => handleVote(opt.id)}
                className={`group relative py-3 px-4 flex justify-between items-center transition-all ${
                  votedId === opt.id 
                    ? 'bg-gold-500 text-black' 
                    : 'bg-white/5 hover:bg-white/10 text-white'
                } border border-white/10 overflow-hidden`}
              >
                <span className="font-black italic text-xs uppercase tracking-tighter z-10">
                  {opt.label}
                </span>
                <span className={`text-[10px] font-bold z-10 ${votedId === opt.id ? 'text-black/60' : 'text-gold-500'}`}>
                  {opt.odds}
                </span>

                {/* Progress bar simulation on result */}
                {showResult && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: opt.id === 'yes' ? '70%' : '30%' }}
                    className={`absolute inset-y-0 left-0 ${votedId === opt.id ? 'bg-white/20' : 'bg-gold-500/10'}`}
                  />
                )}
              </button>
            ))}
          </div>

          {showResult && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex justify-center"
            >
               <span className="text-[9px] font-black text-gold-500 uppercase tracking-widest animate-pulse">
                  PREDICTION LOCKED IN. CALCULATING HYPE POINTS...
               </span>
            </motion.div>
          )}

          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center grayscale opacity-50">
             <span className="text-[8px] font-bold text-white/40 italic">2.4k VOTED IN CHAT</span>
             <span className="text-[8px] font-bold text-white/40 italic tracking-widest uppercase">Global Lobby #IPL04</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
