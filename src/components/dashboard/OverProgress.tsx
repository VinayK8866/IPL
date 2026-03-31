'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useCricketRealtime } from '@/hooks/useCricketRealtime';

export const OverProgress = ({ matchId }: { matchId: string }) => {
    const { score } = useCricketRealtime(matchId);
    
    // Extract last 6 balls from commentary or last_balls
    // In our case, we'll parse the live_commentary to show the actual results
    const balls = score?.live_commentary?.slice(0, 6).reverse().map(p => {
        const text = p.ball.toLowerCase();
        let result = '.';
        let color = '#374151'; // Neutral gray-700
        
        if (text.includes('four') || text.includes('4 runs')) { result = '4'; color = '#7A3FE1'; }
        else if (text.includes('six') || text.includes('6 runs')) { result = '6'; color = '#FFD700'; }
        else if (text.includes('out') || text.includes('wicket')) { result = 'W'; color = '#FF3366'; }
        else if (text.includes('1 run')) { result = '1'; color = '#1F2937'; }
        else if (text.includes('2 runs')) { result = '2'; color = '#1F2937'; }
        else if (text.includes('3 runs')) { result = '3'; color = '#1F2937'; }
        
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
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="w-10 h-10 border border-white/5 bg-white/2" />
                    ))
                )}
            </div>
        </div>
    );
};
