'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Zap, Activity } from 'lucide-react';

interface RichCommentaryProps {
  commentary: any[];
}

export const RichCommentary: React.FC<RichCommentaryProps> = ({ commentary }) => {
  if (!commentary || commentary.length === 0) {
    return (
      <div className="p-8 text-center bg-[#05070A] border border-white/5 skew-x-[-2deg]">
        <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-xs">Waiting for Scraper Sync...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {commentary.map((ball, idx) => {
        const isWicket = ball.type === 'wicket';
        const isBoundary = ball.type === 'boundary';
        
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            key={idx} 
            className={`p-4 border border-white/5 relative overflow-hidden flex gap-4 items-start ${
              isWicket ? 'bg-[#FF3366]/10 border-[#FF3366]/30' : 
              isBoundary ? 'bg-[#FFD700]/10 border-[#FFD700]/30' : 
              'bg-[#1A1F29]/40'
            }`}
          >
            <div className={`shrink-0 w-10 h-10 flex items-center justify-center font-black italic text-sm skew-x-[-10deg] border border-white/10 ${
              isWicket ? 'bg-[#FF3366] text-white' : 
              isBoundary ? 'bg-[#FFD700] text-black' : 
              'bg-[#05070A] text-[#7A3FE1]'
            }`}>
              {ball.run || ball.over}
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Over {ball.over}</span>
                {isWicket && <span className="text-[9px] font-black bg-[#FF3366] px-2 py-0.5 text-white uppercase italic skew-x-[-10deg]">Wicket</span>}
                {isBoundary && <span className="text-[9px] font-black bg-[#FFD700] px-2 py-0.5 text-black uppercase italic skew-x-[-10deg]">Boundary</span>}
              </div>
              <p className="text-sm font-bold text-gray-300 leading-relaxed italic">
                {ball.text}
              </p>
            </div>
            
            {(isWicket || isBoundary) && (
              <div className="absolute top-0 right-0 p-1">
                <Zap size={10} className={isWicket ? 'text-[#FF3366]' : 'text-[#FFD700]'} />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
