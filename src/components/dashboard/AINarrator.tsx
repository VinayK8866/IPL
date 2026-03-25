'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Zap, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

interface Commentary {
  over: string
  ball: string
  type: string
}

export default function AINarrator({ matchId }: { matchId: string }) {
  const [commentary, setCommentary] = useState<Commentary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Initial Fetch
    const fetchMatch = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('live_commentary')
        .eq('id', matchId)
        .single()

      if (data?.live_commentary) {
        setCommentary(data.live_commentary as Commentary[])
      }
      setLoading(false)
    }

    fetchMatch()

    // 2. Realtime Subscription
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload: { new: { live_commentary: Commentary[] } }) => {
          if (payload.new.live_commentary) {
            setCommentary(payload.new.live_commentary)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  if (loading) return <div className="animate-pulse bg-[#05070A] h-full w-full border border-white/5" />

  return (
    <div className="bg-[#05070A] h-full flex flex-col border border-white/10 relative overflow-hidden">
      {/* Visual Accents */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7A3FE1] to-transparent" />
      <div className="absolute bottom-0 right-0 w-16 h-16 bg-[#FF3366]/5 blur-3xl rounded-full" />

      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-white/5 bg-[#1A1F29]/20">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[#7A3FE1]" />
          <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase italic">
            Autonomous Commentary <span className="text-[#FF3366]">v4.2</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#00FF94] rounded-full animate-pulse shadow-[0_0_8px_#00FF94]" />
            <span className="text-[8px] font-black text-[#00FF94] uppercase tracking-widest">Live Stream Synced</span>
        </div>
      </div>

      {/* Narrative Body */}
      <div className="flex-1 p-5 overflow-y-auto no-scrollbar space-y-6">
        <AnimatePresence mode="popLayout">
          {commentary.map((item: Commentary, idx: number) => (
            <motion.div
              key={`${item.over}-${idx}`}
              initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`relative border-l-2 pl-4 py-1 ${
                item.type === 'six' ? 'border-[#FF3366] bg-[#FF3366]/5' : 
                item.type === 'wicket' ? 'border-[#7A3FE1] bg-[#7A3FE1]/5' : 
                'border-white/10'
              }`}
            >
              {/* Over Marker */}
              <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-[#0B0E14] border border-inherit flex items-center justify-center rotate-45">
                 <span className="text-[7px] font-black -rotate-45 text-white/40">{item.over}</span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                   {item.type === 'six' && <Zap size={12} className="text-[#FF3366] animate-pulse" />}
                   {item.type === 'wicket' && <ShieldAlert size={12} className="text-[#7A3FE1] animate-bounce" />}
                   <span className={`text-[9px] font-black uppercase tracking-widest ${
                     item.type === 'six' ? 'text-[#FF3366]' : 
                     item.type === 'wicket' ? 'text-[#7A3FE1]' : 
                     'text-white/40'
                   }`}>
                     {item.type === 'six' ? 'High Impact Event' : 
                      item.type === 'wicket' ? 'Crucial Dismissal' : 
                      'Normal Delivery'}
                   </span>
                </div>
                <p className={`text-sm md:text-lg font-black italic tracking-tight leading-tight uppercase ${
                  item.type === 'six' ? 'text-white drop-shadow-[0_0_10px_rgba(255,51,102,0.5)]' : 
                  'text-gray-300'
                }`}>
                  {item.ball}
                </p>
              </div>

              {/* Intensity Bar */}
              {item.type === 'six' && (
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-[2px] bg-gradient-to-r from-[#FF3366] to-transparent mt-2" 
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <div className="p-3 bg-[#05070A] border-t border-white/5 flex justify-between items-center italic">
         <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Source: Google SERP Sync</span>
         <span className="text-[8px] font-black text-[#7A3FE1] uppercase tracking-[0.2em]">Jugaad Tech Architecture</span>
      </div>
    </div>
  )
}
