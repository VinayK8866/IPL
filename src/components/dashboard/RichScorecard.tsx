'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Table, User, Zap } from 'lucide-react';

interface RichScorecardProps {
  scorecard: any[];
}

export const RichScorecard: React.FC<RichScorecardProps> = ({ scorecard }) => {
  if (!scorecard || scorecard.length === 0) {
    return (
      <div className="p-8 text-center bg-[#05070A] border border-white/5 skew-x-[-2deg]">
        <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-xs">Waiting for Scraper Sync...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {scorecard.map((innings, idx) => (
        <div key={idx} className="bg-[#1A1F29]/40 border border-white/5 overflow-hidden">
          <div className="bg-[#7A3FE1]/10 p-3 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-black italic text-white uppercase tracking-tighter flex items-center gap-2">
              <Zap size={14} className="text-[#7A3FE1] fill-[#7A3FE1]" />
              {innings.team || `Innings ${idx + 1}`}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-black/20">
                  <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Batter</th>
                  <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Status</th>
                  <th className="p-3 text-[10px] font-black text-[#FFD700] uppercase tracking-widest text-right">R</th>
                  <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">B</th>
                  <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">4s</th>
                  <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">6s</th>
                  <th className="p-3 text-[10px] font-black text-[#7A3FE1] uppercase tracking-widest text-right">SR</th>
                </tr>
              </thead>
              <tbody>
                {innings.batters?.map((batter: any, bIdx: number) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: bIdx * 0.05 }}
                    key={bIdx} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-3 text-xs font-black text-white italic truncate max-w-[150px]">{batter.name}</td>
                    <td className="p-3 text-[9px] font-bold text-gray-500 uppercase italic text-center">{batter.status}</td>
                    <td className="p-3 text-sm font-black text-[#FFD700] tabular-nums text-right">{batter.runs}</td>
                    <td className="p-3 text-xs font-bold text-gray-400 tabular-nums text-right">{batter.balls}</td>
                    <td className="p-3 text-xs font-bold text-white tabular-nums text-right">{batter.fours}</td>
                    <td className="p-3 text-xs font-bold text-white tabular-nums text-right">{batter.sixes}</td>
                    <td className="p-3 text-xs font-black text-[#7A3FE1] tabular-nums text-right italic">{batter.sr}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
