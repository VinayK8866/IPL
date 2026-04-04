"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useCricketRealtime, SyncEventTrigger } from '@/hooks/useCricketRealtime';
import { MatchScore } from '@/lib/data-engine/types';

interface MatchDataContextType {
  score: MatchScore | null;
  hype: any | null;
  momentum: any | null;
  trigger: SyncEventTrigger;
  isConnected: boolean;
  matchId: string | null;
}

const MatchDataContext = createContext<MatchDataContextType | undefined>(undefined);

export const MatchDataProvider: React.FC<{ matchId: string | null; children: ReactNode }> = ({ matchId, children }) => {
  const { score, hype, momentum, trigger, isConnected } = useCricketRealtime(matchId || '');

  return (
    <MatchDataContext.Provider value={{ score, hype, momentum, trigger, isConnected, matchId }}>
      {children}
    </MatchDataContext.Provider>
  );
};

export const useMatchData = () => {
  const context = useContext(MatchDataContext);
  if (!context) {
    throw new Error('useMatchData must be used within a MatchDataProvider');
  }
  return context;
};
