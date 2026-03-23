import { useMemo } from 'react';
import { useCricketRealtime } from './useCricketRealtime';

/**
 * PROJECT CRICKET PULSE - PLAYER 'ON-FIRE' LOGIC HOOK
 * 
 * Monitors specific player stats (Strike Rate & Wickets) with broadcast latency sync.
 * Triggers: 
 *   - Batter: SR > 200 with minimum 10 balls.
 *   - Bowler: Wicket taken within the last 60 seconds.
 */

export const usePlayerFireState = (playerName: string, matchId: string) => {
  const { score } = useCricketRealtime(matchId);

  return useMemo(() => {
    if (!score) return { isGlowing: false, intensity: 0 };

    // 1. Batter Check: Strike Rate threshold logic
    const batter = score.batters.find(b => b.name === playerName);
    if (batter && batter.strikeRate >= 200 && batter.balls >= 10) {
      // Calculate intensity based on how much they exceed 200 (capped at 1.0)
      const intensity = Math.min(1, 0.5 + (batter.strikeRate - 200) / 150);
      return { isGlowing: true, intensity };
    }

    // 2. Bowler Check: Recent Wicket logic (within last 60 seconds relative to match time)
    // score.timestamp represents the 'effective current time' after latency offset
    const currentMatchTime = new Date(score.timestamp).getTime();
    
    const recentWicket = score.last_balls.some(ball => {
      const ballTime = new Date(ball.timestamp).getTime();
      const ageInSeconds = (currentMatchTime - ballTime) / 1000;
      
      // Check if it's a wicket and within 60s, and belongs to the player
      // We also check for 'trigger === WICKET' but better to verify data-source directly
      return ball.is_wicket && 
             ageInSeconds >= 0 && 
             ageInSeconds <= 60 && 
             ball.bowler_name === playerName;
    });

    if (recentWicket) {
      return { isGlowing: true, intensity: 1.0 };
    }

    return { isGlowing: false, intensity: 0 };
  }, [score, playerName]);
};
