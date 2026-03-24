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

        // Subscribe to socket for live updates
        const unsubscribe = momentumSocket.subscribe((data: any) => {
            if (data.matches) {
                console.log('SOCKET RECEIVED MATCHES:', data.matches[0]);
                setMatches(data.matches);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);



    const filteredMatches = matches.filter(m => filter === 'ALL' || m.status === filter);

    // Calculate counts for each filter dynamically
    const allCount = matches.length;
    const liveCount = matches.filter(m => m.status === 'LIVE').length;
    const resultCount = matches.filter(m => m.status === 'RESULT').length;
    const upcomingCount = matches.filter(m => m.status === 'UPCOMING').length;

    return (
        <div className="flex flex-col w-full min-h-screen bg-[#f3f4f6] text-black font-sans">
            {/* Top Header */}
            <header className="bg-[#1a1c20] text-white p-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <div className="bg-[#d71920] px-3 py-1 font-black text-xl italic tracking-tighter">ESPN</div>
                    <nav className="hidden md:flex gap-6 text-xs font-bold uppercase tracking-widest text-gray-300">
                        <span className="text-white border-b-2 border-red-500 pb-1 cursor-pointer">Live Scores</span>
                        <span className="hover:text-white transition-colors cursor-pointer">Series</span>
                        <span className="hover:text-white transition-colors cursor-pointer">Teams</span>
                        <span className="hover:text-white transition-colors cursor-pointer">News</span>
                        <span className="hover:text-white transition-colors cursor-pointer">Features</span>
                        <span className="hover:text-white transition-colors cursor-pointer">Statsguru</span>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <Search size={18} className="text-gray-400 cursor-pointer" />
                    <Monitor size={18} className="text-gray-400 cursor-pointer" />
                    <button className="bg-white/10 hover:bg-white/20 transition-all rounded-full p-2">
                        <ListFilter size={16} />
                    </button>
                    <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center font-bold text-xs">V</div>
                </div>
            </header>

            {/* Sub-bar with filters */}
            <div className="bg-white border-b border-gray-200 px-6 py-2 flex flex-wrap justify-between items-center sticky top-0 z-50 overflow-x-auto no-scrollbar">
                <div className="flex gap-8 whitespace-nowrap overflow-x-auto no-scrollbar">
                    <FilterButton active={filter === 'ALL'} label={`Matches (${matches.length})`} onClick={() => setFilter('ALL')} />
                    <FilterButton active={filter === 'LIVE'} label={`Live (${matches.filter(m => m.status === 'LIVE').length})`} onClick={() => setFilter('LIVE')} icon={<div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />} />
                    <FilterButton active={filter === 'RESULT'} label={`Result (${matches.filter(m => m.status === 'RESULT').length})`} onClick={() => setFilter('RESULT')} />
                    <FilterButton active={filter === 'UPCOMING'} label={`Upcoming (${matches.filter(m => m.status === 'UPCOMING').length})`} onClick={() => setFilter('UPCOMING')} />
                </div>

                <div className="flex items-center gap-4 py-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-400">
                        <Calendar size={12} />
                        <span>March 24, 2026</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="p-4 md:p-8 max-w-7xl mx-auto w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                        Cricket <span className="text-red-600 underline decoration-2 underline-offset-4">Pulse Scores</span>
                    </h2>
                    <button 
                        onClick={() => {
                            setLoading(true);
                            fetchMatchesFromApi();
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-full transition-all active:scale-95"
                    >
                        <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh Scores
                    </button>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className="bg-white animate-pulse h-40 rounded-sm border border-gray-200" />
                        ))
                    ) : filteredMatches.length > 0 ? (
                        filteredMatches.map(match => (
                            <EspnMatchCard key={match.id} match={match} />
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center flex flex-col gap-4">
                            <p className="text-gray-400 font-bold uppercase tracking-widest">No matches found for this filter</p>
                            {matches.length > 0 && (
                                <p className="text-xs text-red-500 font-black">
                                    DEBUG: Received {matches.length} matches but mapping failed. Card [0] name: {matches[0].name || 'UNDEFINED'}
                                </p>
                            )}
                        </div>
                    )}

                </div>
            </main>

            {/* Footer */}
            <footer className="mt-auto bg-gray-100 border-t border-gray-200 p-8 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                <p>© 2026 ESPNCricinfo - Cricket Pulse Integration</p>
            </footer>
        </div>
    );
};

const FilterButton: React.FC<{ active: boolean; label: string; icon?: React.ReactNode; onClick: () => void }> = ({ active, label, icon, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-1 py-3 text-[11px] font-black uppercase tracking-wider transition-all border-b-2 ${active ? 'text-red-600 border-red-600' : 'text-gray-500 border-transparent hover:text-black hover:border-gray-300'}`}
    >
        {icon}
        {label}
    </button>
);

export default EspnDashboard;
