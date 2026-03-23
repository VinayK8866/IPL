"use client";

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ChatMessage as ChatMessageType } from '@/lib/data-engine/types';
import { useLatencyRef } from '@/providers/LatencyProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap } from 'lucide-react';

/**
 * STREAM LAYOUT - BROADCAST CHAT OVERLAY
 * 
 * Filters only HIGH-SENTIMENT (>0.8) and EXPERT INSIGHT messages.
 * Synchronized with match_delay_offset for OBS stream.
 */

interface BroadcastChatProps {
  matchId: string;
}

export const BroadcastChat = React.memo(({ matchId }: BroadcastChatProps) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const queue = useRef<{ data: ChatMessageType; arrival: number }[]>([]);
  const getOffset = useLatencyRef();

  // Subscription for high-sentiment messages only
  useEffect(() => {
    if (!matchId) return;

    // Direct fetch of recent high-hype messages for initial view
    const init = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, profiles(username, avatar_url, fan_coins)')
        .eq('match_id', matchId)
        .or('sentiment_score.gt.0.8,is_hype_insight.eq.true')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) setMessages(data.reverse());
    };
    init();

    // Subscribe to ALL then filter locally (since Realtime filtering on scores is tricky)
    const sub = supabase
      .channel(`broadcast-chat:${matchId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `match_id=eq.${matchId}`
      }, async (payload) => {
        const msg = payload.new as ChatMessageType;
        
        // Filter criteria: Sentiment > 0.8 or expert insight
        if (msg.sentiment_score > 0.8 || msg.is_hype_insight) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, fan_coins')
            .eq('id', msg.user_id)
            .single();

          queue.current.push({
            data: { ...msg, profiles: profile },
            arrival: Date.now()
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [matchId]);

  // Sync draining loop
  useEffect(() => {
    let frame: number;
    const processQueue = () => {
      const now = Date.now();
      const delay = getOffset() * 1000;

      while (queue.current.length > 0 && (now - queue.current[0].arrival) >= delay) {
        const next = queue.current.shift();
        if (next) setMessages(prev => [...prev.slice(-4), next.data]);
      }
      frame = requestAnimationFrame(processQueue);
    };
    frame = requestAnimationFrame(processQueue);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="flex flex-col gap-4 w-72 pointer-events-none p-6">
      <div className="flex items-center gap-2 mb-2 p-2 bg-gradient-to-r from-purple-600 to-transparent border-l-4 border-purple-500">
        <ShieldAlert size={16} className="text-white animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white italic">HYPE STREAM</span>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.8 }}
            className="p-3 bg-black/80 border-l-2 border-gold-500 shadow-[0_0_15px_rgba(255,215,0,0.2)] flex flex-col gap-1 relative overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black italic tracking-widest text-gold-400 capitalize">
                {msg.profiles?.username || 'Expert'}
              </span>
              <Zap size={10} className="text-yellow-400 fill-yellow-400" />
            </div>
            <p className="text-xs text-white/90 font-bold leading-tight">
              {msg.content}
            </p>
            {/* Animated Glow Border */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500 to-transparent shadow-[0_0_10px_gold]" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

BroadcastChat.displayName = 'BroadcastChat';
