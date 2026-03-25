"use client";

import React, { useRef, useEffect, useMemo } from 'react';
import { useChatSync } from '@/hooks/useChatSync';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

/**
 * HypeChat Component
 * 
 * Main container for the community 'Hype Chat'.
 * Handles high-frequency message flow with memoized updates.
 */

interface HypeChatProps {
  matchId: string;
}

export const HypeChat = ({ matchId }: HypeChatProps) => {
  const messages = useChatSync(matchId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Identify Pinned Insight: Latest message with is_hype_insight = true
  const pinnedInsight = useMemo(() => {
    return [...messages].reverse().find(m => m.is_hype_insight);
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#0B0E14] border-l border-blue-500/10 shadow-2xl relative overflow-hidden group">
      {/* Dynamic Header */}
      <div className="p-4 border-b border-blue-500/20 bg-gradient-to-r from-navy-950/80 to-[#0B0E14] flex justify-between items-center relative z-20">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_#FF3366]" />
          FEED_SYNC_BETA
        </h3>
        <div className="flex items-center gap-2">
           <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Fans:</span>
           <span className="text-[10px] font-black text-blue-400 tabular-nums">1,242</span>
        </div>
      </div>

      {/* Pinned Expert Insight Overlay */}
      <AnimatePresence>
        {pinnedInsight && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="m-2 relative z-10"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 blur opacity-20" />
            <div className="relative bg-[#1A1F29]/95 border border-purple-500/30 p-3 skew-x-[-2deg]">
               <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-purple-600 rounded-sm">
                    <ShieldAlert size={10} className="text-white" />
                  </div>
                  <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Global Insight</span>
               </div>
               <p className="text-[11px] text-gray-200 italic leading-tight">
                  "{pinnedInsight.content}"
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent relative z-0"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
      </div>

      {/* Input Overlay */}
      <ChatInput matchId={matchId} />
      
      {/* Global CSS for background glow */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_0%,_#4c1d95_0%,_transparent_50%)]" />
    </div>
  );
};
