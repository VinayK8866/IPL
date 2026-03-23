"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChatMessage as ChatMessageType } from '@/lib/data-engine/types';
import { clsx } from 'clsx';
import { ShieldAlert, Zap } from 'lucide-react';

/**
 * ChatMessage Component
 * 
 * Implements 'Cyber-Sport' aesthetic with GLSL-inspired glow for high-coin users.
 * Auto-filters based on 'match_delay_offset' (handled by hook).
 */

interface ChatMessageProps {
  message: ChatMessageType;
}

const EXPERT_THRESHOLD = 0.8;

export const ChatMessage = React.memo(({ message }: ChatMessageProps) => {
  const isHighCoin = (message.profiles?.fan_coins || 0) > 50000;
  const isExpertAnalysis = message.sentiment_score > EXPERT_THRESHOLD;

  const glowStyle = useMemo(() => {
    if (!isHighCoin) return {};
    return {
      textShadow: '0 0 8px rgba(255, 215, 0, 0.8), 0 0 15px rgba(255, 215, 0, 0.5)',
      color: '#FFD700',
      animation: 'pulse-glow 2s infinite ease-in-out'
    };
  }, [isHighCoin]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className={clsx(
        "flex flex-col mb-4 p-3 border-l-2 relative overflow-hidden",
        isExpertAnalysis 
          ? "bg-gradient-to-r from-purple-900/40 to-transparent border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]" 
          : "bg-[#0B0E14]/60 border-blue-500/20"
      )}
      style={isExpertAnalysis ? { filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.3))' } : {}}
    >
      {isExpertAnalysis && (
        <div className="absolute top-0 right-0 p-1 flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 text-[10px] font-black uppercase tracking-widest text-white px-3 rounded-bl-lg">
          <ShieldAlert size={12} className="animate-pulse" />
          Expert Analysis
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        {message.profiles?.avatar_url && (
          <img 
            src={message.profiles.avatar_url} 
            alt="avatar" 
            className={clsx(
              "w-6 h-6 rounded-sm border",
              isHighCoin ? "border-gold-500 shadow-[0_0_5px_gold]" : "border-blue-500/50"
            )}
          />
        )}
        <span 
          style={glowStyle}
          className={clsx(
            "text-sm font-bold tracking-tight",
            isHighCoin ? "text-gold-400" : "text-blue-400"
          )}
        >
          {message.profiles?.username || 'Fan'}
        </span>
        {isHighCoin && (
          <div className="flex gap-1 animate-bounce">
            <Zap size={14} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_5px_rgba(255,255,0,0.8)]" />
            <span className="text-[10px] font-black text-gold-500 drop-shadow-[0_0_2px_gold]">WHALE</span>
          </div>
        )}
      </div>

      <p className={clsx(
        "text-sm leading-relaxed",
        isExpertAnalysis ? "text-purple-100 italic" : "text-gray-300"
      )}>
        {message.content}
      </p>

      {/* High-intensity CSS Animation for High-Coin Glow */}
      <style jsx>{`
        @keyframes pulse-glow {
          0% { text-shadow: 0 0 8px rgba(255, 215, 0, 0.8); }
          50% { text-shadow: 0 0 18px rgba(255, 215, 0, 1), 0 0 25px rgba(255, 165, 0, 0.6); }
          100% { text-shadow: 0 0 8px rgba(255, 215, 0, 0.8); }
        }
      `}</style>
    </motion.div>
  );
});

ChatMessage.displayName = 'ChatMessage';
