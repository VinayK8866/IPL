"use client";

import { useLatency, useLatencyRef } from '@/providers/LatencyProvider';
import { useCallback, useRef } from 'react';

/**
 * useLatencySync Hook
 * 
 * High-adrenaline event synchronization tool for 'Cyber-Sport' dashboards.
 * Releases visual triggers (Confetti, GLSL Explosions) only after the 
 * global broadcast delay has elapsed.
 */

export function useLatencySync() {
  const { offset } = useLatency();
  const getOffset = useLatencyRef();
  const timeouts = useRef<Set<NodeJS.Timeout>>(new Set());

  // Function to delay a visual trigger callback by the current global offset
  const syncDelay = useCallback((callback: () => void, eventTime?: number) => {
    const currentOffset = getOffset();
    const delayMs = currentOffset * 1000;
    
    // If eventTime is provided, we calculate relative to that
    // Otherwise we delay from the current moment
    const startTime = eventTime ? eventTime : Date.now();
    const wait = Math.max(0, delayMs - (Date.now() - startTime));

    const timeout = setTimeout(() => {
      callback();
      timeouts.current.delete(timeout);
    }, wait);

    timeouts.current.add(timeout);
    
    return () => {
      clearTimeout(timeout);
      timeouts.current.delete(timeout);
    };
  }, [getOffset]);

  // Clean up timeouts on unmount
  const clearAll = useCallback(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current.clear();
  }, []);

  return {
    offset,
    syncDelay,
    clearAll
  };
}
