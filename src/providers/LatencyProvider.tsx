"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

/**
 * PROJECT CRICKET PULSE - LATENCY SYNC SYSTEM
 * 
 * Performance-optimized latency management.
 * Provides State Context for UI components and Ref Context for high-frequency data hooks.
 */

interface LatencyStateContextType {
  offset: number;
  setOffset: (val: number) => void;
}

const LatencyStateContext = createContext<LatencyStateContextType | undefined>(undefined);
const LatencyRefContext = createContext<(() => number) | undefined>(undefined);

export const LatencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [offset, setOffsetState] = useState<number>(2);
  const offsetRef = useRef<number>(2);

  useEffect(() => {
    const saved = localStorage.getItem('match_delay_offset');
    if (saved) {
      const val = parseInt(saved, 10);
      setOffsetState(val);
      offsetRef.current = val;
    }
  }, []);

  const setOffset = (val: number) => {
    setOffsetState(val);
    offsetRef.current = val;
    localStorage.setItem('match_delay_offset', val.toString());
  };

  const getOffset = () => offsetRef.current;

  return (
    <LatencyStateContext.Provider value={{ offset, setOffset }}>
      <LatencyRefContext.Provider value={getOffset}>
        {children}
      </LatencyRefContext.Provider>
    </LatencyStateContext.Provider>
  );
};

// UI Components use this to re-render on slider move
export const useLatency = () => {
  const context = useContext(LatencyStateContext);
  if (!context) throw new Error('useLatency must be used within LatencyProvider');
  return context;
};

// High-performance hooks use this to get current value WITHOUT re-renders
export const useLatencyRef = () => {
  const context = useContext(LatencyRefContext);
  if (!context) throw new Error('useLatencyRef must be used within LatencyProvider');
  return context;
};
