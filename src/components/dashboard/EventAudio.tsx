'use client';

import React, { useEffect, useRef } from 'react';
import { useCricketRealtime, SyncEventTrigger } from '@/hooks/useCricketRealtime';

export const EventAudio = ({ matchId }: { matchId: string }) => {
    const { trigger } = useCricketRealtime(matchId);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Audio sources (using common open URLs for demonstration)
    const SOUNDS = {
        'BOUNDARY_FOUR': 'https://www.myinstants.com/media/sounds/sega-rally-game-over-1.mp3', // Placeholder for "Boundary!"
        'BOUNDARY_SIX': 'https://www.myinstants.com/media/sounds/crowd-cheering.mp3',
        'WICKET': 'https://www.myinstants.com/media/sounds/fail-sound-effect.mp3', // Placeholder for "Out!"
        'MILESTONE': 'https://www.myinstants.com/media/sounds/tada-fanfare-plus.mp3'
    };

    useEffect(() => {
        if (!trigger || !SOUNDS[trigger as keyof typeof SOUNDS]) return;
        
        const audio = new Audio(SOUNDS[trigger as keyof typeof SOUNDS]);
        audio.volume = 0.4;
        audio.play().catch(e => console.warn('Audio play was prevented by browser security:', e.message));
    }, [trigger]);

    return null; // This is a logic-only component
};
