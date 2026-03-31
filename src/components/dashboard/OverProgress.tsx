'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useCricketRealtime } from '@/hooks/useCricketRealtime';

export const OverProgress = ({ matchId }: { matchId: string }) => {
    const { score } = useCricketRealtime(matchId);
    
    // Use structured 'type' property for 100% accuracy
    const balls = score?.live_commentary?.slice(0, 6).reverse().map(p => {
        let result = '.';
        let color = '#374151'; // gray-700 (Dot/Default)
        
        const type = p.type?.toLowerCase();
        
        if (type === 'four') { result = '4'; color = '#7A3FE1'; }
        else if (type === 'six') { result = '6'; color = '#FFD700'; }
        else if (type === 'wicket') { result = 'W'; color = '#FF3366'; }
        else if (p.ball.toLowerCase().includes('1 run')) { result = '1'; color = '#4B5563'; }
        else if (p.ball.toLowerCase().includes('2 runs')) { result = '2'; color = '#4B5563'; }
        else if (p.ball.toLowerCase().includes('3 runs')) { result = '3'; color = '#4B5563'; }
        
        return { result, color };
    }) || [];

    return (
        <div className="bg-[#05070A]/80 border border-white/5 p-4 skew-x-[-5deg]">
            <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] skew-x-[5deg]">
                    Over Progression
                </span>
                <span className="text-[10px] font-black text-[#7A3FE1] skew-x-[5deg]">
                    V3.2 DATA
                </span>
            </div>
            
            <div className="flex gap-2">
                {balls.length > 0 ? balls.map((ball, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`w-10 h-10 flex items-center justify-center border-t-2 font-black italic text-sm skew-x-[5deg]`}
                        style={{ backgroundColor: `${ball.color}33`, borderColor: ball.color, color: ball.color === '#1F2937' ? '#9CA3AF' : ball.color }}
                    >
                        {ball.result}
                    </motion.div>
                )) : (
                    <div className="w-full h-10 flex items-center px-4 bg-white/5 border border-dashed border-white/10 group overflow-hidden">
                        <motion.span 
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-700 animate-pulse" />
                            Awaiting Live Feed...
                        </motion.span>
                    </div>
                )}
            </div>
        </div>
    );
};
