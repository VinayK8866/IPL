import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLatencyRef } from '@/providers/LatencyProvider';
import { momentumSocket } from '../lib/data-engine/socket-client';
import { MomentumData, MatchHype, MatchScore } from '../lib/data-engine/types';

/**
 * PROJECT CRICKET PULSE - REALTIME HOOK (Serverless-Compatible)
 * 
 * Two-tier data strategy:
 * 1. Primary: Poll /api/match/[id] serverless endpoint every 5s (works on Vercel)
 * 2. Secondary: Supabase Realtime via momentumSocket (for instant updates when worker is running)
 * 
 * Includes deduplication, latency synchronization, and event detection.
 */

// Local type for trigger states
export type SyncEventTrigger = 'WICKET' | 'BOUNDARY_FOUR' | 'BOUNDARY_SIX' | 'MILESTONE' | null;

interface QueuedEvent<T> {
  data: T;
  at_timestamp: number;
}

export function useCricketRealtime(matchId: string) {
  const getOffset = useLatencyRef();
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [hype, setHype] = useState<MatchHype | null>(null);
  const [score, setScore] = useState<MatchScore | null>(null);
  const [trigger, setTrigger] = useState<SyncEventTrigger>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Queues for buffering
  const momentumQueue = useRef<QueuedEvent<MomentumData>[]>([]);
  const hypeQueue = useRef<QueuedEvent<MatchHype>[]>([]);
  const scoreQueue = useRef<QueuedEvent<MatchScore>[]>([]);

  // Last committed IDs for deduplication
  const lastMomentumId = useRef<string | null>(null);
  const lastScoreTimestamp = useRef<string | null>(null);
  const prevScoreData = useRef<MatchScore | null>(null);

  // Track if API polling has provided data
  const hasApiData = useRef(false);

  // Shared function to process incoming data (from Poll OR Socket)
  const processIncomingData = useCallback((matchData: any) => {
    // Normalization layer: Map various formats to internal MatchScore/Momentum types
    const normalizedScore: MatchScore = {
      match_id: matchData.id || matchData.match_id,
      team_a: matchData.team_a || matchData.teamA?.name || 'TBA',
      team_b: matchData.team_b || matchData.teamB?.name || 'TBA',
      score: (matchData.score && matchData.score !== '0/0') ? matchData.score : (matchData.teamA?.score || matchData.teamB?.score || '0/0'),
      overs: matchData.overs || matchData.teamA?.overs || matchData.teamB?.overs || '0.0',
      crr: matchData.crr || 0,
      predicted_score: matchData.predicted_score || matchData.predictedScore || 0,
      status_text: matchData.status_text || matchData.statusText || '',
      win_prob_a: matchData.win_prob_a ?? (matchData.winProbA ?? 0.5),
      win_prob_b: matchData.win_prob_b ?? (matchData.winProbB ?? 0.5),
      is_second_innings: matchData.is_second_innings || false,
      target: matchData.target || 0,
      over_limit: matchData.over_limit || 20,
      batters: matchData.batters || [],
      bowlers: matchData.bowlers || [],
      last_balls: matchData.last_balls || [],
      live_commentary: matchData.live_commentary || [],
      timestamp: matchData.timestamp || new Date().toISOString()

    };


    const normalizedMomentum: MomentumData = {
      match_id: normalizedScore.match_id,
      momentum_score: (normalizedScore.win_prob_a - 0.5) * 20,
      timestamp: normalizedScore.timestamp
    };

    // Queue for synchronization with broadcast lag
    momentumQueue.current.push({
      data: normalizedMomentum,
      at_timestamp: Date.now()
    });

    scoreQueue.current.push({
      data: normalizedScore,
      at_timestamp: Date.now()
    });

    hasApiData.current = true;
    setIsConnected(true);
  }, []);

  // Processing loop to drain queues
  useEffect(() => {
    let animationFrameId: number;

    const processQueues = () => {
      const now = Date.now();
      const delayMs = getOffset() * 1000;

      // Process Momentum Queue
      while (momentumQueue.current.length > 0 &&
        (now - momentumQueue.current[0].at_timestamp) >= delayMs) {
        const next = momentumQueue.current.shift();
        if (next) {
          const momentumId = `${next.data.match_id}-${next.data.timestamp}`;
          if (momentumId !== lastMomentumId.current) {
            setMomentum(next.data);
            lastMomentumId.current = momentumId;
          }
        }
      }

      // Process Hype Queue
      while (hypeQueue.current.length > 0 &&
        (now - hypeQueue.current[0].at_timestamp) >= delayMs) {
        const next = hypeQueue.current.shift();
        if (next) {
          setHype(prev => {
            if (!prev) return next.data;
            const prevTotal = prev.team_a_clicks + prev.team_b_clicks;
            const currentTotal = next.data.team_a_clicks + next.data.team_b_clicks;

            if (currentTotal - prevTotal > 100) {
              setTrigger('MILESTONE');
              setTimeout(() => setTrigger(null), 2000);
            }

            if (JSON.stringify(prev) === JSON.stringify(next.data)) return prev;
            return next.data;
          });
        }
      }

      // Process Score Queue
      while (scoreQueue.current.length > 0 &&
        (now - scoreQueue.current[0].at_timestamp) >= delayMs) {
        const next = scoreQueue.current.shift();
        if (next) {
          if (next.data.timestamp !== lastScoreTimestamp.current) {
            // Detect Boundaries and Wickets before committing to state
            if (prevScoreData.current) {
              const prev = prevScoreData.current;
              const current = next.data;

              // 1. Detect Wickets
              const prevWickets = parseInt(prev.score.split('/')[1] || '0');
              const currentWickets = parseInt(current.score.split('/')[1] || '0');
              if (currentWickets > prevWickets) {
                setTrigger('WICKET');
                setTimeout(() => setTrigger(null), 3000);
              }

              // 2. Detect Boundaries
              let boundaryHit: SyncEventTrigger = null;
              current.batters.forEach((b) => {
                const prevB = prev.batters.find(pb => pb.name === b.name);
                if (prevB) {
                  if (b.sixes > prevB.sixes) boundaryHit = 'BOUNDARY_SIX';
                  else if (b.fours > prevB.fours) boundaryHit = 'BOUNDARY_FOUR';
                }
              });

              if (boundaryHit) {
                setTrigger(boundaryHit);
                setTimeout(() => setTrigger(null), 3000);
              }
            }

            setScore(next.data);
            lastScoreTimestamp.current = next.data.timestamp;
            prevScoreData.current = next.data;
          }
        }
      }

      animationFrameId = requestAnimationFrame(processQueues);
    };

    animationFrameId = requestAnimationFrame(processQueues);
    return () => cancelAnimationFrame(animationFrameId);
  }, [getOffset]);

  // ===== TIER 1: API POLLING (Serverless-compatible, works on Vercel) =====
  useEffect(() => {
    if (!matchId) return;

    let isMounted = true;
    let pollTimer: ReturnType<typeof setInterval>;

    const fetchFromApi = async () => {
      try {
        const res = await fetch(`/api/match/${matchId}`);
        if (!res.ok) return;

        const data = await res.json();
        if (!isMounted || data.error) return;

        processIncomingData(data);
      } catch (err) {
        console.warn(`[API Poll] Failed to fetch match ${matchId}:`, err);
      }
    };

    // Initial fetch immediately
    fetchFromApi();

    // Poll every 3 seconds for live data (Extreme responsiveness)
    pollTimer = setInterval(fetchFromApi, 3000);

    // ===== TIER 2: Supabase Realtime (Heartbeat-driven instant poll) =====
    // This listens for any change in the DB and triggers an IMMEDIATE fetch
    // bypassing the 4s wait.
    const unsubscribe = momentumSocket.subscribe((payload: any) => {
      // If payload contains data, process it
      if (payload.id === matchId || payload.match_id === matchId) {
          processIncomingData(payload);
          return;
      }
      
      // If it's a generic heartbeat (matches: []), trigger a fresh poll
      if (payload.matches && Array.isArray(payload.matches) && payload.matches.length === 0) {
          fetchFromApi();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      unsubscribe();
    };
  }, [matchId, processIncomingData]);

  // Heavy memoization for performance
  const memoizedMomentum = useMemo(() => momentum, [momentum]);
  const memoizedHype = useMemo(() => hype, [hype]);
  const memoizedScore = useMemo(() => score, [score]);
  const memoizedTrigger = useMemo(() => trigger, [trigger]);

  return {
    momentum: memoizedMomentum,
    hype: memoizedHype,
    score: memoizedScore,
    trigger: memoizedTrigger,
    isConnected: isConnected || hasApiData.current
  };
}
