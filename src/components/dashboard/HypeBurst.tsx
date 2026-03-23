"use client";

import React from 'react';
import { useLatencySync } from '@/lib/hooks/useLatencySync';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

/**
 * HypeBurst Component
 * 
 * Demonstration of useLatencySync hook.
 * Pypes a "Manual Hype Blast" through the broadcast delay to sync with stream.
 */

export const HypeBurst = () => {
  const { syncDelay, offset } = useLatencySync();

  const handleBurst = () => {
    // Pipe the visual trigger through the global sync delay
    syncDelay(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#7A3FE1', '#FF3366', '#FFD700']
      });
    });
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleBurst}
      className="w-full mt-4 py-3 bg-gradient-to-r from-purple-950 to-pink-950 border border-pink-500/50 text-[10px] font-black uppercase tracking-widest italic text-pink-400 hover:text-white transition-colors relative overflow-hidden"
    >
      <div className="relative z-10 flex items-center justify-center gap-2">
        Trigger Hype Blast
        <span className="text-[8px] bg-pink-500 text-white px-1 not-italic">+{offset}s Lagsync</span>
      </div>
      {/* Background Pulse */}
      <div className="absolute inset-0 bg-pink-500/10 animate-pulse" />
    </motion.button>
  );
};
