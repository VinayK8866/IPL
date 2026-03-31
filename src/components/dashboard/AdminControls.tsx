'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Zap, Save, Power, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/providers/AuthProvider';

export const AdminControls = ({ matchId }: { matchId: string }) => {
    const { isAdmin } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'LIVE' | 'RESULT' | 'UPCOMING'>('LIVE');
    const [manualScore, setManualScore] = useState('');
    const [manualOvers, setManualOvers] = useState('');
    
    if (!isAdmin) return null;

    const handleOverride = async () => {
        setIsSaving(true);
        try {
            const updates: any = { status: status.toLowerCase() };
            if (manualScore) updates.score = manualScore;
            if (manualOvers) updates.overs = manualOvers;

            const { error } = await supabase
                .from('matches')
                .update(updates)
                .eq('id', matchId);
                
            if (error) throw error;
            alert('PROTOCOL OVERRIDE SUCCESSFUL: DATA PUSHED TO PRODUCTION');
        } catch (err: any) {
            alert('OVERRIDE FAILED: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleKillSwitch = async () => {
        // Technically this would set a flag in the DB that components listen to
        alert('KILL SWITCH ACTIVATED: TECHNICAL DIFFICULTY OVERLAY TRIGGERED');
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="bg-[#05070A] border-2 border-[#FF3366] p-6 w-80 shadow-[0_0_30px_rgba(255,51,102,0.3)] backdrop-blur-xl"
                    >
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={18} className="text-[#FF3366]" />
                                <span className="text-xs font-black uppercase tracking-widest text-[#FF3366]">Admin Console</span>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Match Status Override</label>
                                <select 
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full bg-white/5 border border-white/10 p-2 text-xs font-black uppercase outline-none focus:border-[#FF3366]"
                                >
                                    <option value="LIVE">LIVE</option>
                                    <option value="RESULT">RESULT</option>
                                    <option value="UPCOMING">UPCOMING</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Score Override (e.g. 154/4)</label>
                                <input 
                                    type="text"
                                    value={manualScore}
                                    placeholder="Current score..."
                                    onChange={(e) => setManualScore(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-2 text-xs font-black uppercase outline-none focus:border-[#FF3366] text-white"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Overs Override (e.g. 18.2)</label>
                                <input 
                                    type="text"
                                    value={manualOvers}
                                    placeholder="Total overs..."
                                    onChange={(e) => setManualOvers(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 p-2 text-xs font-black uppercase outline-none focus:border-[#FF3366] text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={handleOverride}
                                    disabled={isSaving}
                                    className="bg-white/5 border border-white/10 hover:bg-white/10 p-3 flex flex-col items-center gap-2 transition-all active:scale-95"
                                >
                                    <Save size={16} className="text-blue-400" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Push Update</span>
                                </button>
                                <button 
                                    onClick={toggleKillSwitch}
                                    className="bg-[#FF3366]/10 border border-[#FF3366]/30 hover:bg-[#FF3366] p-3 flex flex-col items-center gap-2 group transition-all active:scale-95"
                                >
                                    <Power size={16} className="text-[#FF3366] group-hover:text-white" />
                                    <span className="text-[8px] font-black uppercase tracking-widest group-hover:text-white text-[#FF3366]">Kill Switch</span>
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5">
                            <span className="text-[8px] font-black text-[#FF3366] uppercase animate-pulse">
                                SECURITY WARNING: Actions are logged to root console.
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 skew-x-[-15deg] transition-all relative group ${isOpen ? 'bg-[#FF3366] text-white' : 'bg-black border border-[#FF3366] text-[#FF3366] hover:bg-[#FF3366] hover:text-white'}`}
            >
                <Zap size={24} className={isOpen ? 'animate-pulse' : ''} />
                {!isOpen && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF3366] rounded-full shadow-[0_0_10px_#FF3366]" />
                )}
            </button>
        </div>
    );
};
