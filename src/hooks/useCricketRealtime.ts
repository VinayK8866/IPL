import { useState, useEffect, useRef, useMemo } from 'react';
import { useLatencyRef } from '@/providers/LatencyProvider';
import { momentumSocket } from '../lib/data-engine/socket-client';
import { supabase } from '../lib/supabaseClient';
import { MomentumData, MatchHype, MatchScore } from '../lib/data-engine/types';

/**
 * PROJECT CRICKET PULSE - REALTIME HOOK
 * 
 * Manages WebSocket/Realtime subscriptions with broadcast latency synchronization.
 * Includes a deduplication layer and high-performance queuing.
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
          // Deduplication check
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
          // Detect Significant Changes for VFX
          setHype(prev => {
            if (!prev) return next.data;

            // Example Trigger logic: If total hype jumps significantly, trigger effect
            const prevTotal = prev.team_a_clicks + prev.team_b_clicks;
            const currentTotal = next.data.team_a_clicks + next.data.team_b_clicks;

            if (currentTotal - prevTotal > 100) {
              setTrigger('MILESTONE');
              setTimeout(() => setTrigger(null), 2000); // Reset after 2s
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

              // 1. Detect Wickets (score format usually X/Y)
              const prevWickets = parseInt(prev.score.split('/')[1] || '0');
              const currentWickets = parseInt(current.score.split('/')[1] || '0');
              if (currentWickets > prevWickets) {
                setTrigger('WICKET');
                setTimeout(() => setTrigger(null), 3000);
              }

              // 2. Detect Boundaries (comparing batter boundary counts)
              // This is a proxy since we don't have ball-by-ball delta here
              let boundaryHit: SyncEventTrigger = null;
              current.batters.forEach((b, idx) => {
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
  }, []);

  // Set up Subscriptions
  useEffect(() => {
    if (!matchId) return;

    // Unified subscription to the relay
    const unsubscribe = momentumSocket.subscribe((payload: any) => {
      // The relay sends either a single update or an array of matches
      let matchData = null;
      
      if (payload.matches && Array.isArray(payload.matches)) {
        matchData = payload.matches.find((m: any) => String(m.id) === String(matchId));
      } else if (String(payload.match_id) === String(matchId) || String(payload.id) === String(matchId)) {
        matchData = payload;
      }

      if (matchData) {
        // Normalization layer: Map socket format to internal MatchScore/Momentum types
        const normalizedScore: MatchScore = {
          match_id: matchData.id || matchData.match_id,
          team_a: matchData.team_a || matchData.teamA?.name || 'TBA',
          team_b: matchData.team_b || matchData.teamB?.name || 'TBA',
          score: matchData.score || matchData.teamA?.score || matchData.teamB?.score || '0/0',
          overs: matchData.overs || matchData.teamA?.overs || matchData.teamB?.overs || '0.0',
          crr: matchData.crr || 0,
          win_prob_a: matchData.win_prob_a ?? (matchData.winProbA ?? 0.5),
          win_prob_b: matchData.win_prob_b ?? (matchData.winProbB ?? 0.5),
          batters: matchData.batters || [],
          bowlers: matchData.bowlers || [],
          last_balls: matchData.last_balls || [],
          timestamp: matchData.timestamp || payload.timestamp || new Date().toISOString()
        };

        const normalizedMomentum: MomentumData = {
          match_id: matchData.id || matchData.match_id,
          momentum_score: matchData.momentum_score || (normalizedScore.win_prob_a - 0.5) * 20,
          timestamp: normalizedScore.timestamp
        };

        // Queue for synchronization
        momentumQueue.current.push({
          data: normalizedMomentum,
          at_timestamp: Date.now()
        });

        scoreQueue.current.push({
          data: normalizedScore,
          at_timestamp: Date.now()
        });

        setIsConnected(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [matchId]);

  // Heavy memoization for performance to prevent React-Three-Fiber re-renders
  const memoizedMomentum = useMemo(() => momentum, [momentum]);
  const memoizedHype = useMemo(() => hype, [hype]);
  const memoizedScore = useMemo(() => score, [score]);
  const memoizedTrigger = useMemo(() => trigger, [trigger]);

  return {
    momentum: memoizedMomentum,
    hype: memoizedHype,
    score: memoizedScore,
    trigger: memoizedTrigger,
    isConnected: isConnected && momentumSocket.isConnected()
  };
}
