import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ChatMessage } from '../lib/data-engine/types';
import { useLatencyRef } from '@/providers/LatencyProvider';

/**
 * useChatSync Hook
 * 
 * Synchronizes real-time chat messages with the global match_delay_offset.
 * Prevents spoilers by buffering incoming messages in a high-performance queue.
 */

export function useChatSync(matchId: string) {
  const getOffset = useLatencyRef();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messageQueue = useRef<{ data: ChatMessage; at: number }[]>([]);
  const lastProcessedId = useRef<string | null>(null);

  // Buffer incoming messages from Supabase Realtime
  useEffect(() => {
    if (!matchId) return;

    // Fetch initial messages
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, content, is_hype_insight, created_at, profiles(username, avatar_url)')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!error && data) {
        setMessages(data.reverse() as ChatMessage[]);
      } else if (error) {
        console.error('[ChatSync] Initial fetch error:', error.message);
      }
    };

    fetchInitial();


    const channel = supabase
      .channel(`chat:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `match_id=eq.${matchId}`
      }, async (payload: any) => {
        // Fetch profile data for the new message
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url, fan_coins')
          .eq('id', payload.new.user_id)
          .single();

        const newMessage = {
          ...payload.new,
          profiles: profile
        } as ChatMessage;

        // Push to high-performance queue
        messageQueue.current.push({
          data: newMessage,
          at: Date.now()
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Synchronized Draining Loop
  useEffect(() => {
    let animationFrameId: number;

    const processQueue = () => {
      const now = Date.now();
      const delayMs = getOffset() * 1000;

      while (messageQueue.current.length > 0 && 
             (now - messageQueue.current[0].at) >= delayMs) {
        const next = messageQueue.current.shift();
        if (next && next.data.id !== lastProcessedId.current) {
          setMessages(prev => [...prev.slice(-49), next.data]);
          lastProcessedId.current = next.data.id;
        }
      }

      animationFrameId = requestAnimationFrame(processQueue);
    };

    animationFrameId = requestAnimationFrame(processQueue);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return messages;
}
