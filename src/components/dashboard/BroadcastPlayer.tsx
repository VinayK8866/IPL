'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Tv, Maximize2, Volume2, ShieldAlert, Settings } from 'lucide-react';

export const BroadcastPlayer = () => {
    const [isLive, setIsLive] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            className="relative w-full aspect-video bg-black border border-white/10 overflow-hidden group mb-4"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Cyberpunk Overlay Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

            {!isLive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative z-10 flex flex-col items-center gap-6"
                    >
                        <div className="bg-[#FF3366] px-4 py-1 skew-x-[-15deg] font-black italic text-sm shadow-[0_0_20px_rgba(255,51,102,0.5)]">
                            BROADCAST OFFLINE
                        </div>
                        
                        <button 
                            onClick={() => setIsLive(true)}
                            className="group/btn relative flex items-center gap-4 bg-white text-black p-4 px-10 skew-x-[-15deg] hover:bg-[#7A3FE1] hover:text-white transition-all transform hover:scale-105 active:scale-95"
                        >
                            <span className="font-black italic text-xl">WATCH LIVE FEED</span>
                            <Play fill="currentColor" size={20} />
                            
                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-20 blur-xl transition-opacity" />
                        </button>
                        
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] mt-2">
                            Secure Encrypted Sport-Stream Protocol V3.2
                        </p>
                    </motion.div>
                </div>
            ) : (
                <div className="absolute inset-0 bg-black flex items-center justify-center">
                    {/* Placeholder for actual HLS player */}
                    <div className="relative w-full h-full">
                        <video 
                            className="w-full h-full object-cover opacity-80"
                            autoPlay 
                            muted 
                            loop 
                            poster="https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2000"
                        >
                            <source src="https://assets.mixkit.co/videos/preview/mixkit-cricket-player-hitting-a-ball-29921-large.mp4" type="video/mp4" />
                        </video>
                        
                        {/* Live UI Overlay */}
                        <div className="absolute top-6 left-6 flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-[#FF3366] px-3 py-1 skew-x-[-15deg] shadow-[0_0_15px_#FF3366]">
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                <span className="font-black italic text-[10px]">LIVE BROADCAST</span>
                            </div>
                            <div className="bg-black/50 backdrop-blur-sm border border-white/10 px-3 py-1 skew-x-[-15deg] text-[10px] font-black text-white/60">
                                4K UHD | 60 FPS
                            </div>
                        </div>

                        {/* Controls Overlay */}
                        <AnimatePresence>
                            {isHovered && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center"
                                >
                                    <div className="flex items-center gap-6">
                                        <Volume2 size={18} className="text-white hover:text-[#7A3FE1] cursor-pointer" />
                                        <div className="h-1 w-32 bg-white/10 relative">
                                            <div className="absolute inset-0 bg-[#7A3FE1] w-[60%]" />
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-6">
                                        <Settings size={18} className="text-white hover:rotate-90 transition-transform cursor-pointer" />
                                        <Maximize2 size={18} className="text-white hover:scale-110 transition-transform cursor-pointer" />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Corner Decorative Elements */}
            <div className="absolute top-0 left-0 p-1 opacity-50">
                <div className="w-10 h-10 border-t border-l border-white/20" />
            </div>
            <div className="absolute bottom-0 right-0 p-1 opacity-50">
                <div className="w-10 h-10 border-b border-r border-white/20" />
            </div>
        </div>
    );
};
