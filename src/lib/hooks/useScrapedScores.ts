import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface ScrapedScore {
  match_id: string;
  team1_name: string;
  team2_name: string;
  team1_score: string;
  team2_score: string;
  match_status: string;
  batting_team: string;
  batters_json?: any[];
  bowlers_json?: any[];
  last_balls_json?: any[];
  scraped_at: string;
}

export const useScrapedScores = () => {
  const [scrapedScores, setScrapedScores] = useState<Record<string, ScrapedScore>>({});

  useEffect(() => {
    // Initial fetch
    const fetchScores = async () => {
      const { data, error } = await supabase
        .from('scraped_scores')
        .select('*');
      
      if (data) {
        const scoresMap = data.reduce((acc, score) => {
          acc[score.match_id] = score;
          return acc;
        }, {} as Record<string, ScrapedScore>);
        setScrapedScores(scoresMap);
      }
    };

    fetchScores();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('scraped-scores-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scraped_scores',
        },
        (payload) => {
          const newScore = payload.new as ScrapedScore;
          if (newScore && newScore.match_id) {
            setScrapedScores(prev => ({
              ...prev,
              [newScore.match_id]: newScore
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return scrapedScores;
};
