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

import { RichScorecard } from '@/components/dashboard/RichScorecard';
import { RichCommentary } from '@/components/dashboard/RichCommentary';

export default function AINarrator({ matchId }: { matchId: string }) {
  const { score } = useMatchData()
  const [view, setView] = useState<'NARRATOR' | 'SCORECARD' | 'FEED'>('NARRATOR')
  const commentary = (score?.live_commentary || []) as Commentary[]
  const loading = !score

  if (loading) return <div className="animate-pulse bg-[#05070A] h-full w-full border border-white/5" />

  return (
    <div className="bg-[#05070A] h-full flex flex-col border border-white/10 relative overflow-hidden">
      {/* Visual Accents */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#7A3FE1] to-transparent" />
      
      <div className="flex flex-col p-3 border-b border-white/5 bg-[#1A1F29]/40 gap-2">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-[#7A3FE1]" />
              <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase italic">
                {view === 'NARRATOR' ? 'Autonomous Commentary' : view === 'SCORECARD' ? 'Tactical Scorecard' : 'Deep Feed'} <span className="text-[#FF3366]">v4.4</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
                <button 
                  onClick={() => setView('NARRATOR')}
                  className={`w-2 h-2 rounded-full border ${view === 'NARRATOR' ? 'bg-[#FF3366] border-[#FF3366]' : 'border-white/20'}`} 
                />
                <button 
                  onClick={() => setView('FEED')}
                  className={`w-2 h-2 rounded-full border ${view === 'FEED' ? 'bg-[#7A3FE1] border-[#7A3FE1]' : 'border-white/20'}`} 
                />
                <button 
                  onClick={() => setView('SCORECARD')}
                  className={`w-2 h-2 rounded-full border ${view === 'SCORECARD' ? 'bg-[#FFD700] border-[#FFD700]' : 'border-white/20'}`} 
                />
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        <AnimatePresence mode="wait">
          {view === 'NARRATOR' && (
            <motion.div 
              key="narrator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5 space-y-6"
            >
               {/* Dynamic Analysis Block */}
               {score && (
                <div className="p-4 bg-[#7A3FE1]/10 border border-[#7A3FE1]/30 rounded-lg skew-x-[-5deg]">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-[#7A3FE1]" />
                    <span className="text-[10px] font-black text-[#7A3FE1] uppercase tracking-[0.2em]">Live Analysis</span>
                  </div>
                  <p className="text-white font-black italic uppercase leading-tight">
                    {score.status_text || 'Match in Progress'}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-2">
                    <div>
                      <span className="text-[8px] text-white/40 uppercase block">Prediction</span>
                      <span className="text-sm font-black text-[#00FF94]">{score.crr || '0.0'} CRR</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-white/40 uppercase block">Target</span>
                      <span className="text-sm font-black text-[#FF3366]">~{score.predicted_score || '0'}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {commentary.map((item: any, idx: number) => (
                <CommentaryItem key={item.id || idx} item={item} idx={idx} />
              ))}
            </motion.div>
          )}

          {view === 'FEED' && (
            <motion.div 
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <RichCommentary commentary={score?.commentary_json || []} />
            </motion.div>
          )}

          {view === 'SCORECARD' && (
            <motion.div 
              key="scorecard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <RichScorecard scorecard={score?.scorecard_json || []} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <div className="p-3 bg-[#05070A] border-t border-white/5 flex justify-between items-center italic">
         <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Source: Scraper Pulse v2</span>
         <div className="flex gap-4">
            <button onClick={() => setView('NARRATOR')} className={`text-[8px] font-black uppercase ${view === 'NARRATOR' ? 'text-white underline' : 'text-gray-600'}`}>Narrator</button>
            <button onClick={() => setView('FEED')} className={`text-[8px] font-black uppercase ${view === 'FEED' ? 'text-white underline' : 'text-gray-600'}`}>Feed</button>
            <button onClick={() => setView('SCORECARD')} className={`text-[8px] font-black uppercase ${view === 'SCORECARD' ? 'text-white underline' : 'text-gray-600'}`}>Score</button>
         </div>
      </div>
    </div>
  )
}

function CommentaryItem({ item, idx }: { item: any, idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.1 }}
      className={`relative border-l-2 pl-4 py-1 mb-6 ${
        item.type === 'six' ? 'border-[#FF3366] bg-[#FF3366]/5' : 
        item.type === 'wicket' ? 'border-[#7A3FE1] bg-[#7A3FE1]/5' : 
        'border-white/10'
      }`}
    >
      <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-[#0B0E14] border border-inherit flex items-center justify-center rotate-45">
          <span className="text-[7px] font-black -rotate-45 text-white/40">{item.over}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
          {item.type === 'six' ? 'MAXIMUM IMPACT' : item.type === 'wicket' ? 'CRUCIAL DISMISSAL' : 'Match Progress'}
        </span>
        <p className="text-sm font-black italic uppercase leading-tight text-gray-300">
          {item.ball}
        </p>
      </div>
    </motion.div>
  )
}
