import { createClient } from '@supabase/supabase-js';

/**
 * PROJECT CRICKET PULSE - NOTIFICATION ENGINE
 * 
 * Background service worker (Manifest V3) monitoring match intensity.
 * Triggers 'Thriller Alerts' for massive momentum shifts.
 */

// Placeholder values - to be populated via build process or env injection
const SUPABASE_URL = (globalThis as any).NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (globalThis as any).NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * THRILLER ALERT LOGIC
 * Trigger a notification if:
 * 1. Win Probability shift is > 15% compared to Previous State.
 * 2. Momentum spikes significantly (optional extra).
 */

let lastMatchStates: Record<string, { win_prob_a: number }> = {};

const setupSubscriptions = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Sync Extension: Supabase credentials missing. Background alerts disabled.');
    return;
  }

  const channel = supabase
    .channel('live-matches')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, (payload) => {
      const { id, win_prob_a, team_a, team_b } = payload.new;
      const prevState = lastMatchStates[id];

      if (prevState) {
        const diff = Math.abs(win_prob_a - prevState.win_prob_a);
        
        // THRILLER THRESHOLD: > 15% Swing
        if (diff > 0.15) {
          triggerThrillerAlert(team_a, team_b, diff);
        }
      }

      // Update state for next check
      lastMatchStates[id] = { win_prob_a };
    })
    .subscribe();
};

const triggerThrillerAlert = (teamA: string, teamB: string, swing: number) => {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/assets/pulse-icon.png', // Assuming icon is present
    title: '🚨 THRILLER ALERT!',
    message: `Massive intensity shift in ${teamA} vs ${teamB}! Win probability swung by ${(swing * 100).toFixed(0)}%! Tune in NOW.`,
    priority: 2
  });
};

setupSubscriptions();

// Service Worker keep-alive logic (V3 requirement)
chrome.runtime.onInstalled.addListener(() => {
  console.log('Cricket Pulse Notification Engine Initialized.');
});
