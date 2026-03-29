import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * PROJECT CRICKET PULSE - PREDICTION STORE HOOK
 * 
 * Manages local user balance, active bets, and match synchronization logic.
 * Implements Optimistic UI updates to ensure responsiveness for high-frequency betting cycles.
 */

export interface PredictionBet {
  type: '6' | '4' | 'wicket' | 'dot' | 'other';
  amount: number;
  ball_index: number;
}

export function usePredictionStore(userId: string | null, matchId: string) {
  const [balance, setBalance] = useState<number>(0);
  const [activeBallIndex, setActiveBallIndex] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Initial State Sync
  useEffect(() => {
    if (!userId || !matchId) return;

    const fetchState = async () => {
      // Get Profile (Balance)
      const { data: profile } = await supabase
        .from('profiles')
        .select('fan_coins')
        .eq('id', userId)
        .single();
      
      if (profile) setBalance(Number(profile.fan_coins));

      // Get current Match lock index
      const { data: match } = await supabase
        .from('matches')
        .select('current_ball_index')
        .eq('id', matchId)
        .single();
      
      if (match) setActiveBallIndex(match.current_ball_index);
    };

    fetchState();

    // Realtime Subscriptions for Balance and Ball Index Locks
    const balanceChannel = supabase.channel(`user-sync:${userId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${userId}` 
      }, (payload: any) => {
        setBalance(Number(payload.new.fan_coins));
      })
      .subscribe();

    const matchChannel = supabase.channel(`match-sync:${matchId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'matches', 
        filter: `id=eq.${matchId}` 
      }, (payload: any) => {
        setActiveBallIndex(payload.new.current_ball_index);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [userId, matchId]);

  // 2. High-Performance Bet Placement with Optimistic UI
  const placeBet = useCallback(async (bet: PredictionBet) => {
    if (!userId || isSyncing) return;
    if (balance < bet.amount) throw new Error('INSUFFICIENT_FUNDS');

    setIsSyncing(true);
    const startBalance = balance;

    // OPTIMISTIC UPDATE: Subtract balance immediately for arcade-feel
    setBalance(prev => prev - bet.amount);

    try {
      const { data, error } = await supabase.rpc('place_ball_prediction', {
        p_user_id: userId,
        p_match_id: matchId,
        p_ball_index: bet.ball_index,
        p_bet_type: bet.type,
        p_amount: bet.amount
      });

      if (error || !data.success) {
        // ROLLBACK on failure
        setBalance(startBalance);
        throw new Error(data?.error || 'PREDICTION_FAILED');
      }

      return data;
    } catch (err) {
      console.error('Bet failed:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [userId, matchId, balance, isSyncing]);

  return {
    balance,
    activeBallIndex,
    placeBet,
    isSyncing
  };
}
