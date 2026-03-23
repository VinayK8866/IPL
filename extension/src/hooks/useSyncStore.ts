import { useState, useEffect, useCallback } from 'react';

/**
 * PROJECT CRICKET PULSE - SYNC STORE
 * 
 * Global state for the extension overlay offset.
 * Persists value across page reloads using chrome.storage.
 */

interface SyncState {
  matchDelayOffset: number; // in milliseconds
  setMatchDelayOffset: (val: number) => void;
}

export const useSyncStore = (): SyncState => {
  const [matchDelayOffset, setMatchDelayOffsetInternal] = useState<number>(2000); // Default 2s

  useEffect(() => {
    // Initial load from chrome.storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['match_delay_offset'], (result) => {
        if (result.match_delay_offset !== undefined) {
          setMatchDelayOffsetInternal(result.match_delay_offset);
        }
      });
    }
  }, []);

  const setMatchDelayOffset = useCallback((val: number) => {
    setMatchDelayOffsetInternal(val);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ match_delay_offset: val });
    }
  }, []);

  // Listen for storage changes from background or popup
  useEffect(() => {
    const handleStorage = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.match_delay_offset) {
        setMatchDelayOffsetInternal(changes.match_delay_offset.newValue);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener(handleStorage);
      return () => chrome.storage.onChanged.removeListener(handleStorage);
    }
  }, []);

  return { matchDelayOffset, setMatchDelayOffset };
};
