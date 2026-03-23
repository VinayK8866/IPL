-- User Profile & Gamification
CREATE TYPE match_status AS ENUM ('live', 'scheduled', 'finished');
CREATE TYPE bet_type AS ENUM ('6', '4', 'wicket', 'dot', 'other');
CREATE TYPE prediction_outcome AS ENUM ('pending', 'won', 'lost');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  fan_coins BIGINT DEFAULT 1000,
  avatar_url TEXT,
  hype_level INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Live Game Data
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  win_prob_a FLOAT DEFAULT 0.5,
  win_prob_b FLOAT DEFAULT 0.5,
  current_momentum_json JSONB, -- Stores wave graph history
  status match_status DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prediction Engine
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  match_id TEXT REFERENCES matches(id),
  ball_index INT, -- To prevent late-betting exploit
  bet_type bet_type,
  amount INT,
  outcome prediction_outcome DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community & AI Chat
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  match_id TEXT REFERENCES matches(id),
  content TEXT,
  sentiment_score FLOAT, -- Gemini analyzed
  is_hype_insight BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Global State
CREATE TABLE match_hype (
  match_id TEXT PRIMARY KEY REFERENCES matches(id),
  team_a_clicks BIGINT DEFAULT 0,
  team_b_clicks BIGINT DEFAULT 0
);

-- Realtime setup
-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE matches, predictions, chat_messages, match_hype;
