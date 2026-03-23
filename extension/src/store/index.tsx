import React, { createContext, useContext, ReactNode } from 'react';
import { useSyncStore as useSyncImpl } from '../hooks/useSyncStore';

/**
 * PROJECT CRICKET PULSE - GLOBAL SYNC CONTEXT
 * 
 * Provides global state for the extension overlay.
 */

interface SyncContextType {
  matchDelayOffset: number;
  setMatchDelayOffset: (val: number) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const syncStore = useSyncImpl();
  return (
    <SyncContext.Provider value={syncStore}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within SyncProvider');
  return context;
};
