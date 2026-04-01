"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Send, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * ChatInput Component
 * 
 * High-adrenaline entry for the Hype Chat.
 * Communicates with Gemini analysis service in the background.
 */

interface ChatInputProps {
  matchId: string;
}

export const ChatInput = ({ matchId }: ChatInputProps) => {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSending) return;

    setIsSending(true);
    const text = content.trim();
    setContent('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please login to join the Hype!");
        setIsSending(false);
        return;
      }

      // Step 1: Immediate low-latency insertion
      const { data: msg, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          match_id: matchId,
          content: text,
          sentiment_score: 0.5, // Default initial sentiment
          is_hype_insight: false
        })
        .select()
        .single();

      if (error) throw error;

      // Step 2: Gemini Analysis in Background (Non-blocking)
      // We offload this to a separate server route to avoid blocking UI or leaking API keys
      fetch('/api/chat/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: msg.id,
          content: text,
          matchContext: `Live Cricket Match with ID: ${matchId}`
        })
      }).catch(err => console.error("Background analysis failed:", err));

    } catch (error) {
      console.error("Submission Error:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 border-t border-blue-500/20 bg-gradient-to-t from-navy-950 to-transparent">
      <form onSubmit={handleSubmit} className="relative group">
        <input 
          type="text" 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="JOIN THE ROAR..."

          disabled={isSending}
          className="w-full bg-[#0B0E14] border-2 border-blue-500/20 rounded-lg py-3 px-4 pr-12 text-blue-100 placeholder-blue-900/50 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition-all font-mono italic"
        />
        
        <button 
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)] hover:scale-110 active:scale-95 transition-all"
        >
          {isSending ? (
            <Zap size={18} className="animate-pulse" />
          ) : (
            <Send size={18} />
          )}
        </button>

        {/* Dynamic Glow Border */}
        <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-600/20 via-pink-600/20 to-gold-400/20 blur opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </form>
    </div>
  );
};
