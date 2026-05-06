'use client';

import Link from 'next/link';
import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, ExternalLink, Monitor } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

export interface EspnMatch {
  id: string;
  name: string;
  series: string;
  status: 'LIVE' | 'RESULT' | 'UPCOMING';
  statusText: string;
  teamA: {
    name: string;
    score?: string;
    overs?: string;
    isBatting?: boolean;
    logo?: string;
  };
  teamB: {
    name: string;
    score?: string;
    overs?: string;
    isBatting?: boolean;
    logo?: string;
  };
  batters?: any[];
  bowlers?: any[];
  last_balls?: any[];
  isScraped?: boolean;
}

const EspnMatchCard: React.FC<{ match: EspnMatch }> = ({ match }) => {
  const isLive = match.status === 'LIVE';
  const { isAdmin } = useAuth();

  return (
    <Link href={`/match/${match.id}`} className="block no-underline">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ x: 5, skewX: -2 }}
        className="bg-[#1A1F29]/80 border border-white/5 p-5 transition-all duration-300 flex flex-col gap-4 relative overflow-hidden group select-none"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#7A3FE1]/10 to-transparent pointer-events-none" />

        <div className="flex justify-between items-start text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] relative z-10">
          <span className="truncate max-w-[200px] border-b border-[#7A3FE1]/30 pb-0.5">{match.series}</span>
          <span className="flex items-center gap-2 bg-[#05070A] px-2 py-0.5 skew-x-[-15deg]">
            {isLive && <div className="w-1.5 h-1.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] animate-pulse" />}
            <span className={isLive ? 'text-[#FF3366]' : ''}>{match.status}</span>
          </span>
        </div>

        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#05070A] border border-white/5 flex items-center justify-center text-[11px] font-black text-[#7A3FE1] skew-x-[-10deg]">
                {match.teamA.name.substring(0, 2).toUpperCase()}
              </div>
              <span className={`text-sm font-black italic uppercase tracking-tighter ${match.teamA.isBatting ? 'text-white' : 'text-gray-400'}`}>
                {match.teamA.name}
              </span>
              {match.teamA.isBatting && <span className="text-[#FF3366] animate-pulse text-lg">·</span>}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-black italic text-white tracking-widest leading-none">{match.teamA.score || '-'}</span>
              {match.teamA.overs && <span className="text-[10px] text-[#7A3FE1] font-bold mt-1 uppercase">({match.teamA.overs} ov)</span>}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#05070A] border border-white/5 flex items-center justify-center text-[11px] font-black text-[#FF3366] skew-x-[-10deg]">
                {match.teamB.name.substring(0, 2).toUpperCase()}
              </div>
              <span className={`text-sm font-black italic uppercase tracking-tighter ${match.teamB.isBatting ? 'text-white' : 'text-gray-400'}`}>
                {match.teamB.name}
              </span>
              {match.teamB.isBatting && <span className="text-[#FF3366] animate-pulse text-lg">·</span>}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-black italic text-white tracking-widest leading-none">{match.teamB.score || '-'}</span>
              {match.teamB.overs && <span className="text-[10px] text-[#FF3366] font-bold mt-1 uppercase">({match.teamB.overs} ov)</span>}
            </div>
          </div>
        </div>

        <div className="mt-2 pt-3 border-t border-white/5 relative z-10">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest line-clamp-2 leading-relaxed italic group-hover:text-white transition-colors">
            {match.statusText}
          </p>
        </div>

        <div className="flex justify-between items-center mt-2 relative z-10">
          <div className="flex gap-4">
            {isAdmin ? (
              <Link
                href={`/stream?id=${match.id}`}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#FF3366] text-white p-2 px-4 italic font-black uppercase tracking-tighter text-[9px] skew-x-[-15deg] hover:bg-white hover:text-black transition-all flex items-center gap-2 group/btn shadow-[0_0_10px_#FF3366]"
              >
                <Monitor size={10} className="group-hover/btn:animate-pulse" />
                Deploy Stream
              </Link>
            ) : (
              <div className="flex items-center gap-2 bg-[#7A3FE1]/10 px-4 py-2 border border-[#7A3FE1]/20 skew-x-[-15deg] group-hover:border-[#7A3FE1]">
                <span className="text-[9px] font-black text-[#7A3FE1] uppercase">Launch Hub</span>
              </div>
            )}
            <div className="flex items-center ml-2">
              <span className="text-[8px] font-black text-[#7A3FE1] opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-[0.3em]">Protocol V3</span>
            </div>
          </div>
          <ExternalLink size={14} className="text-gray-700 group-hover:text-[#FF3366] transition-all transform group-hover:translate-x-1" />
        </div>

        <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#7A3FE1] to-[#FF3366] transition-all duration-500 w-0 group-hover:w-full" />
      </motion.div>
    </Link>
  );
};

export default EspnMatchCard;
