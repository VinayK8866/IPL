import { EspnMatch } from "@/components/dashboard/EspnMatchCard";

export interface MomentumData {
  match_id: string;
  momentum_score: number;
  timestamp: string;
  matches?: EspnMatch[]; // Added for flexible realtime updates
}


export interface MatchHype {
  match_id: string;
  team_a_clicks: number;
  team_b_clicks: number;
}

export interface Batter {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

export interface Bowler {
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface BallData {
  x: number;
  y: number;
  z?: number;
  type: 'pace' | 'spin' | 'special';
  is_wicket: boolean;
  bowler_name?: string; // Added to support player-specific fire state
  timestamp: string;
}

export interface MatchScore {
  match_id: string;
  team_a: string;
  team_b: string;
  score: string;
  overs: string;
  crr: number;
  rrr?: number;
  win_prob_a: number; // 0 to 1
  win_prob_b: number; // 0 to 1
  batters: Batter[];
  bowlers: Bowler[]; // Added bowlers list
  last_balls: BallData[];
  status?: string;
  status_text?: string;
  predicted_score?: number;
  live_commentary?: any[];
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  match_id: string;
  content: string;
  sentiment_score: number;
  is_hype_insight: boolean;
  created_at: string;
  // Join data from profiles
  profiles?: {
    username: string;
    avatar_url: string | null;
    fan_coins: number;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  fan_coins: number;
  avatar_url: string | null;
  hype_level: number;
  created_at: string;
}

export interface CricketRealtimeState {
  momentum: MomentumData | null;
  hype: MatchHype | null;
  score: MatchScore | null;
  isConnected: boolean;
}
