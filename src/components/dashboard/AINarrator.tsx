'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Zap, ShieldAlert } from 'lucide-react'

import { useCricketRealtime } from '@/hooks/useCricketRealtime'

interface Commentary {
  over: string
  ball: string
  type: string
}

import { useMatchData } from '@/providers/MatchDataProvider'

export default function AINarrator({ matchId }: { matchId: string }) {
  const { score } = useMatchData()
  const commentary = (score?.live_commentary || []) as Commentary[]
  const loading = !score

  if (loading) return <div className="animate-pulse bg-[#05070A] h-full w-full border border-white/5" />

  return (
    <div className="bg-[#05070A] h-full flex flex-col border border-white/10 relative overflow-hidden">
      {/* Visual Accents */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7A3FE1] to-transparent" />
      <div className="absolute bottom-0 right-0 w-16 h-16 bg-[#FF3366]/5 blur-3xl rounded-full" />

      <div className="flex flex-col p-3 border-b border-white/5 bg-[#1A1F29]/40 gap-2">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-[#7A3FE1]" />
              <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase italic">
                Autonomous Commentary <span className="text-[#FF3366]">v4.4</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#00FF94] rounded-full animate-pulse shadow-[0_0_8px_#00FF94]" />
                <span className="text-[8px] font-black text-[#00FF94] uppercase tracking-widest">Synced</span>
            </div>
        </div>
        <div className="flex justify-start">
            <a 
              href={`https://www.google.com/search?q=${encodeURIComponent(matchId?.replace('-', ' ') || 'IPL')} live commentary`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[8px] font-black text-[#7A3FE1] hover:text-white uppercase tracking-[0.2em] border border-[#7A3FE1]/30 px-3 py-1 rounded transition-all italic bg-[#7A3FE1]/5"
            >
              Verify Real-Time Data on Google ↗
            </a>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto no-scrollbar space-y-6">
        {/* Dynamic Analysis Block */}
        {score && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-[#7A3FE1]/10 border border-[#7A3FE1]/30 rounded-lg skew-x-[-5deg]"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-[#7A3FE1]" />
              <span className="text-[10px] font-black text-[#7A3FE1] uppercase tracking-[0.2em]">Gemini Live Analysis</span>
            </div>
            <p className="text-white font-black italic uppercase leading-tight">
              {score.status_text || 'Match in Progress'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-2">
              <div>
                <span className="text-[8px] text-white/40 uppercase block">CRR Prediction</span>
                <span className="text-sm font-black text-[#00FF94]">{score.crr || '0.0'}</span>
              </div>
              <div>
                <span className="text-[8px] text-white/40 uppercase block">Target View</span>
                <span className="text-sm font-black text-[#FF3366]">~{score.predicted_score || '0'}</span>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {commentary.length > 0 ? (
            commentary.map((item: any, idx: number) => (
              <motion.div
                key={item.id || `${item.over}-${idx}`}
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
                     {item.type === 'four' && <Zap size={12} className="text-[#00F0FF] animate-pulse" />}
                     {item.type === 'wicket' && <ShieldAlert size={12} className="text-[#7A3FE1] animate-bounce" />}
                     <span className={`text-[9px] font-black uppercase tracking-widest ${
                       item.type === 'six' ? 'text-[#FF3366]' : 
                       item.type === 'four' ? 'text-[#00F0FF]' : 
                       item.type === 'wicket' ? 'text-[#7A3FE1]' : 
                       'text-white/40'
                     }`}>
                       {item.type === 'six' ? 'MAXIMUM IMPACT' : 
                        item.type === 'four' ? 'BOUNDARY REACHED' : 
                        item.type === 'wicket' ? 'CRUCIAL DISMISSAL' : 
                        'Match Progress'}
                     </span>
                  </div>
                  <p className={`text-sm md:text-lg font-black italic tracking-tight leading-tight uppercase ${
                    item.type === 'six' ? 'text-white drop-shadow-[0_0_10px_rgba(255,51,102,0.5)]' : 
                    'text-gray-300'
                  }`}>
                    {item.ball}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 opacity-20">
               <Zap size={40} className="mb-4 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-[0.5em]">Awaiting Live Feed...</span>
            </div>
          )}
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
