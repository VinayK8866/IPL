"use client";

import React, { useRef, useEffect } from 'react';
import { useChatSync } from '@/hooks/useChatSync';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#0B0E14] border-l border-blue-500/10 shadow-2xl relative overflow-hidden">
      {/* Dynamic Header */}
      <div className="p-4 border-b border-blue-500/20 bg-gradient-to-r from-navy-950 to-[#0B0E14] flex justify-between items-center">
        <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          Hype Chat Beta
        </h3>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Live Fans:</span>
           <span className="text-[10px] font-black text-blue-400 tabular-nums">1.2k</span>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-blue-500/20 scrollbar-track-transparent"
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
