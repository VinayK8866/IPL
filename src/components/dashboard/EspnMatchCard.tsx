import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, ExternalLink } from 'lucide-react';

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
}

const EspnMatchCard: React.FC<{ match: EspnMatch }> = ({ match }) => {
  const isLive = match.status === 'LIVE';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ borderColor: '#d71920' }}
      className="bg-white border-l-4 border-l-transparent border border-gray-200 p-4 transition-all duration-300 flex flex-col gap-3 min-w-[320px] max-w-[400px] shadow-sm hover:shadow-md cursor-pointer group"
    >
      <div className="flex justify-between items-start text-[10px] font-bold text-gray-500 uppercase tracking-tight">
        <span className="truncate max-w-[200px]">{match.series}</span>
        <span className="flex items-center gap-1">
          {isLive && <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />}
          {match.status}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {/* Team A */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-black text-gray-400">
                    {match.teamA.name.substring(0, 2).toUpperCase()}
                </div>
                <span className={`text-sm font-bold ${match.teamA.isBatting ? 'text-black' : 'text-gray-600'}`}>
                    {match.teamA.name}
                </span>
                {match.teamA.isBatting && <span className="text-[10px] text-red-600 font-black">*</span>}
            </div>
            <div className="flex flex-col items-end">
                <span className="text-sm font-black text-black">{match.teamA.score || '-'}</span>
                {match.teamA.overs && <span className="text-[9px] text-gray-400 font-bold">{match.teamA.overs} ov</span>}
            </div>
        </div>

        {/* Team B */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-black text-gray-400">
                    {match.teamB.name.substring(0, 2).toUpperCase()}
                </div>
                <span className={`text-sm font-bold ${match.teamB.isBatting ? 'text-black' : 'text-gray-600'}`}>
                    {match.teamB.name}
                </span>
                {match.teamB.isBatting && <span className="text-[10px] text-red-600 font-black">*</span>}
            </div>
            <div className="flex flex-col items-end">
                <span className="text-sm font-black text-black">{match.teamB.score || '-'}</span>
                {match.teamB.overs && <span className="text-[9px] text-gray-400 font-bold">{match.teamB.overs} ov</span>}
            </div>
        </div>
      </div>

      <div className="mt-1 pt-2 border-t border-gray-100">
        <p className="text-[11px] text-gray-700 font-medium line-clamp-1 italic">
            {match.statusText}
        </p>
      </div>

      <div className="flex justify-between items-center mt-1">
          <div className="flex gap-4">
              <span className="text-[10px] font-bold text-red-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">Scorecard</span>
              <span className="text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">Report</span>
          </div>
          <ExternalLink size={12} className="text-gray-300 group-hover:text-red-500 transition-colors" />
      </div>
    </motion.div>
  );
};

export default EspnMatchCard;
