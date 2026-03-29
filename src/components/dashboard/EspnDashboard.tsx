import React, { useState, useEffect } from 'react';
import EspnMatchCard, { EspnMatch } from './EspnMatchCard';
import { Search, Monitor, Calendar, CheckSquare, ListFilter, RefreshCcw } from 'lucide-react';

import { momentumSocket } from '../../lib/data-engine/socket-client';

const EspnDashboard: React.FC = () => {
    const [matches, setMatches] = useState<EspnMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'RESULT' | 'UPCOMING'>('ALL');

    const fetchMatchesFromApi = async () => {
        try {
            console.log('Fetching matches from /api/matches...');
            const response = await fetch('/api/matches');
            const data = await response.json();
            
            if (data.matches) {
                console.log(`API RECEIVED ${data.matches.length} MATCHES`);
                setMatches(data.matches);
            } else if (data.error) {
                console.error('API Error:', data.error);
            }
        } catch (err) {
            console.error('API Fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // First try the API as it's more stable
        fetchMatchesFromApi();

        // Subscribe to socket for live updates (now powered by Supabase Realtime)
        const unsubscribe = momentumSocket.subscribe((data: any) => {
            if (data.matches && data.matches.length > 0) {
                console.log('SOCKET RECEIVED MATCHES:', data.matches[0]);
                setMatches(data.matches);
                setLoading(false);
            } else {
                // If we get a generic signal (empty matches), it means DB changed.
                // Re-fetch from our serverless API to get the latest synced state.
                console.log('REALTIME SIGNAL: DB changed, re-fetching...');
                fetchMatchesFromApi();
            }
        });

        // POLLING FALLBACK:
        // If the socket isn't connected or for redundancy, poll the API every 10s
        const pollInterval = setInterval(() => {
            console.log('Polling fallback: Refreshing matches...');
            fetchMatchesFromApi();
        }, 10000);

        return () => {
            unsubscribe();
            clearInterval(pollInterval);
        };
    }, []);



    const filteredMatches = matches.filter(m => filter === 'ALL' || m.status === filter);

    // Calculate counts for each filter dynamically
    const allCount = matches.length;
    const liveCount = matches.filter(m => m.status === 'LIVE').length;
    const resultCount = matches.filter(m => m.status === 'RESULT').length;
    const upcomingCount = matches.filter(m => m.status === 'UPCOMING').length;

    return (
        <div className="flex flex-col w-full min-h-screen bg-[#0B0E14] text-white font-sans selection:bg-[#7A3FE1]/30">
            {/* Top Header */}
            <header className="bg-[#05070A] border-b border-white/5 p-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
                <div className="flex items-center gap-4">
                    <div className="bg-[#7A3FE1] px-3 py-1 font-black text-xl italic tracking-tighter skew-x-[-10deg] shadow-[0_0_15px_rgba(122,63,225,0.5)]">
                        CRICKET PULSE
                    </div>
                    <nav className="hidden md:flex gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        <span className="text-white border-b-2 border-[#FF3366] pb-1 cursor-pointer">Live Hub</span>
                        <span className="hover:text-white transition-colors cursor-pointer">Series</span>
                        <span className="hover:text-white transition-colors cursor-pointer">Rankings</span>
                        <span className="hover:text-white transition-colors cursor-pointer">News</span>
                        <span className="hover:text-white transition-colors cursor-pointer">Vault</span>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <Search size={18} className="text-gray-400 cursor-pointer hover:text-[#7A3FE1] transition-colors" />
                    <Monitor size={18} className="text-gray-400 cursor-pointer hover:text-[#FF3366] transition-colors" />
                    <button className="bg-white/5 hover:bg-white/10 border border-white/10 transition-all p-2 skew-x-[-10deg]">
                        <ListFilter size={16} />
                    </button>
                    <div className="h-8 w-8 bg-gradient-to-br from-[#7A3FE1] to-[#FF3366] flex items-center justify-center font-black text-xs skew-x-[-5deg] shadow-[0_0_10px_rgba(122,63,225,0.3)]">V</div>
                </div>
            </header>

            {/* Sub-bar with filters */}
            <div className="bg-[#0B0E14] border-b border-white/5 px-6 py-2 flex flex-wrap justify-between items-center z-40 overflow-x-auto no-scrollbar">
                <div className="flex gap-8 whitespace-nowrap overflow-x-auto no-scrollbar">
                    <FilterButton active={filter === 'ALL'} label={`TOTAL (${matches.length})`} onClick={() => setFilter('ALL')} />
                    <FilterButton 
                        active={filter === 'LIVE'} 
                        label={`LIVE (${matches.filter(m => m.status === 'LIVE').length})`} 
                        onClick={() => setFilter('LIVE')} 
                        icon={<div className="w-1.5 h-1.5 rounded-full bg-[#FF3366] shadow-[0_0_8px_#FF3366] animate-pulse" />} 
                    />
                    <FilterButton active={filter === 'RESULT'} label={`FINISHED (${matches.filter(m => m.status === 'RESULT').length})`} onClick={() => setFilter('RESULT')} />
                    <FilterButton active={filter === 'UPCOMING'} label={`UPCOMING (${matches.filter(m => m.status === 'UPCOMING').length})`} onClick={() => setFilter('UPCOMING')} />
                </div>

                <div className="flex items-center gap-4 py-2">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase text-gray-500 tracking-[0.3em]">
                        <Calendar size={12} className="text-[#7A3FE1]" />
                        <span>MARCH 25, 2026</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="p-4 md:p-8 max-w-7xl mx-auto w-full relative">
                {/* Decorative Background Accents */}
                <div className="absolute top-20 right-0 w-96 h-96 bg-[#7A3FE1]/5 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FF3366]/5 blur-[100px] pointer-events-none" />

                <div className="flex justify-between items-center mb-10 border-l-4 border-[#7A3FE1] pl-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-[#7A3FE1] tracking-[0.5em] uppercase">Visual Hub</span>
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
                            Active <span className="text-[#FF3366]">Deployments</span>
                        </h2>
                    </div>
                    
                    <button 
                        onClick={() => {
                            setLoading(true);
                            fetchMatchesFromApi();
                        }}
                        className="flex items-center gap-3 text-[10px] font-black text-[#7A3FE1] border border-[#7A3FE1]/30 hover:bg-[#7A3FE1] hover:text-white px-5 py-2 skew-x-[-15deg] transition-all active:scale-95 uppercase tracking-widest"
                    >
                        <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                        Resync Data
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className="bg-[#1A1F29]/40 h-48 border border-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                            </div>
                        ))
                    ) : filteredMatches.length > 0 ? (
                        filteredMatches.map(match => (
                            <div key={match.id} className="relative group/card">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#7A3FE1]/0 to-[#FF3366]/0 group-hover/card:from-[#7A3FE1]/20 group-hover/card:to-[#FF3366]/20 transition duration-500 blur-sm" />
                                <EspnMatchCard match={match} />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-32 text-center flex flex-col items-center gap-6 border border-dashed border-white/10 bg-white/2 cursor-crosshair">
                            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                            <p className="text-gray-500 font-black uppercase tracking-[0.5em] text-xs">No active streams detected</p>
                            {matches.length > 0 && (
                                <div className="bg-[#FF3366]/10 border border-[#FF3366]/20 p-4 max-w-md">
                                    <p className="text-[10px] text-[#FF3366] font-black uppercase tracking-widest leading-relaxed">
                                        ANALYTICS: Captured {matches.length} matches but protocol filter mapping failed. Validating source endpoints...
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-auto border-t border-white/5 p-10 bg-[#05070A]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 opacity-40">
                    <p className="text-[9px] font-black text-white uppercase tracking-[0.5em]">© 2026 CRICKET PULSE - ZERO-LATENCY ENGINE</p>
                    <div className="flex gap-8 text-[9px] font-black text-white uppercase tracking-widest">
                        <span className="hover:text-[#7A3FE1] cursor-pointer transition-colors">Documentation</span>
                        <span className="hover:text-[#FF3366] cursor-pointer transition-colors">API Status</span>
                        <span className="hover:text-[#FFD700] cursor-pointer transition-colors">Protocol V3</span>
                    </div>
                </div>
            </footer>
            
            <style jsx global>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

const FilterButton: React.FC<{ active: boolean; label: string; icon?: React.ReactNode; onClick: () => void }> = ({ active, label, icon, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 px-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${active ? 'text-[#FF3366] border-[#FF3366]' : 'text-gray-500 border-transparent hover:text-white hover:border-gray-700'}`}
    >
        {icon}
        {label}
    </button>
);

export default EspnDashboard;
