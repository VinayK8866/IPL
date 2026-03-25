"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, ShieldAlert, Cpu } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface TickerItem {
  id: string | number;
  type: 'EXPERT' | 'HYPE' | 'TACTICAL' | 'UPDATE';
  text: string;
}

export const ScrollingTicker = React.memo(() => {
  const [liveItems, setLiveItems] = useState<TickerItem[]>([]);
  const MATCH_ID = 'match_12345'; // Configured default

  useEffect(() => {
    const fetchLatest = async () => {
      const { data } = await supabase
        .from('matches')
        .select('live_commentary')
        .eq('id', MATCH_ID)
        .single();
      
      if (data?.live_commentary) {
        const commentary: TickerItem[] = (data.live_commentary as any[]).slice(0, 5).map((c, i) => ({
          id: `live-${i}`,
          type: (c.type === 'six' || c.type === 'wicket' ? 'EXPERT' : 'TACTICAL') as TickerItem['type'],
          text: `${c.over}: ${c.ball}`.toUpperCase()
        }));
        setLiveItems(commentary);
      }
    };

    fetchLatest();

    const channel = supabase
      .channel('ticker-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${MATCH_ID}` }, (payload: { new: { live_commentary: any[] } }) => {
        if (payload.new.live_commentary) {
          const commentary: TickerItem[] = (payload.new.live_commentary).slice(0, 5).map((c, i) => ({
            id: `live-${i}-${Date.now()}`,
            type: (c.type === 'six' || c.type === 'wicket' ? 'EXPERT' : 'TACTICAL') as TickerItem['type'],
            text: `${c.over}: ${c.ball}`.toUpperCase()
          }));
          setLiveItems(commentary);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [MATCH_ID]);

  const scrollingItems = useMemo(() => {
    const base = liveItems.length > 0 ? liveItems : [
      { id: 1, type: 'UPDATE', text: 'INITIALIZING PULSE DATA ENGINE... 20ms LOCAL SYNC ACTIVE' },
      { id: 2, type: 'TACTICAL', text: 'GEMINI AI: ANALYZING MOMENTUM VOLATILITY FOR NEXT OVER' }
    ] as TickerItem[];
    return [...base, ...base, ...base, ...base];
  }, [liveItems]);

  return (
    <div className="w-full bg-[#05070A]/80 border-t-2 border-pink-600/50 backdrop-blur-xl h-16 flex items-center overflow-hidden relative">
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 px-6 h-full flex items-center gap-3 z-10 skew-x-[-15deg] translate-x-[-10px] shadow-[10px_0_20px_rgba(0,0,0,0.5)]">
        <Cpu size={20} className="text-white fill-white animate-pulse" />
        <span className="text-sm font-black italic text-white uppercase tracking-tighter skew-x-[15deg] drop-shadow-md">
          CYBER BROADCAST FEED
        </span>
      </div>

      <div className="flex-1 relative overflow-hidden h-full flex items-center">
        <motion.div
          animate={{ x: [0, -1500] }}
          transition={{ duration: 40, ease: "linear", repeat: Infinity }}
          className="flex whitespace-nowrap gap-12"
        >
          {scrollingItems.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {item.type === 'EXPERT' && <ShieldAlert size={14} className="text-[#FF3366] animate-pulse" />}
                {item.type === 'TACTICAL' && <Zap size={14} className="text-gold-500" />}
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  item.type === 'EXPERT' ? 'text-[#FF3366]' : 'text-blue-400'
                }`}>
                  {item.type}:
                </span>
              </div>
              <span className="text-sm font-black text-white/90 tracking-wider font-mono italic">
                {item.text}
              </span>
              <span className="text-blue-500/20 mx-4 font-black">:::</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-[#0B0E14] to-transparent pointer-events-none z-10" />
    </div>
  );
});

ScrollingTicker.displayName = 'ScrollingTicker';
