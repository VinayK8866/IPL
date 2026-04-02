'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCricketRealtime } from '@/hooks/useCricketRealtime';

/**
 * OVER PROGRESSION — Shows recent match events as an over-by-over timeline.
 * 
 * Since ESPN no longer provides per-ball `plays` data for IPL 2026,
 * this component now renders key match events (wickets, milestones,
 * powerplays, timeouts) as a visual timeline instead of a ball-by-ball strip.
 */

interface OverEvent {
    label: string;
    color: string;
    icon: string;
    over: string;
}

export const OverProgress = ({ matchId }: { matchId: string }) => {
    const { score } = useCricketRealtime(matchId);

    const events: OverEvent[] = useMemo(() => {
        if (!score?.live_commentary || score.live_commentary.length === 0) return [];

        return score.live_commentary
            .filter((c: any) => c.type !== 'status') // Skip the top status line
            .slice(0, 8)
            .map((c: any) => {
                const type = (c.type || 'normal').toLowerCase();
                let label = '';
                let color = '#374151';
                let icon = '·';

                if (type === 'wicket') {
                    label = 'W';
                    color = '#FF3366';
                    icon = '🏏';
                } else if (type === 'milestone') {
                    label = '★';
                    color = '#FFD700';
                    icon = '⭐';
                } else if (type === 'powerplay') {
                    label = 'PP';
                    color = '#7A3FE1';
                    icon = '⚡';
                } else if (type === 'timeout') {
                    label = 'TO';
                    color = '#00F0FF';
                    icon = '⏱';
                } else if (type === 'innings_break') {
                    label = 'INN';
                    color = '#FFD700';
                    icon = '🔄';
                } else {
                    label = '•';
                    color = '#4B5563';
                    icon = '📋';
                }

                return { label, color, icon, over: c.over || '' };
            });
    }, [score?.live_commentary]);

    // Also compute a simple over-by-over run rate bar from the current score
    const currentOvers = parseFloat(score?.overs || '0');
    const currentRuns = parseInt(score?.score?.split('/')[0] || '0');
    const wickets = parseInt(score?.score?.split('/')[1] || '0');

    return (
        <div className="bg-[#05070A]/80 border border-white/5 p-4 skew-x-[-5deg]">
            <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] skew-x-[5deg]">
                    MATCH TIMELINE
                </span>
                <span className="text-[10px] font-black text-[#7A3FE1] skew-x-[5deg]">
                    {currentOvers > 0 ? `${currentRuns}/${wickets} (${score?.overs} ov)` : 'WARMING UP'}
                </span>
            </div>

            {/* Event Timeline Strip */}
            <div className="flex gap-2 mb-3">
                {events.length > 0 ? events.map((event, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="w-10 h-10 flex items-center justify-center border-t-2 font-black italic text-sm skew-x-[5deg] relative group cursor-default"
                        style={{
                            backgroundColor: `${event.color}22`,
                            borderColor: event.color,
                            color: event.color
                        }}
                        title={`Over ${event.over}`}
                    >
                        {event.label}
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

            {/* Run Rate Progress Bar */}
            {currentOvers > 0 && (
                <div className="flex items-center gap-3 skew-x-[5deg]">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{
                                background: `linear-gradient(90deg, #7A3FE1, ${(currentRuns / currentOvers) > 8 ? '#FF3366' : '#00F0FF'})`,
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((currentOvers / (score?.over_limit || 20)) * 100, 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                    <span className="text-[9px] font-black text-gray-500 uppercase">
                        CRR {(score?.crr || 0).toFixed(1)}
                    </span>
                </div>
            )}
        </div>
    );
};
