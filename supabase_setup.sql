-- PROJECT CRICKET PULSE - SUPABASE SCHEMA & INFRASTRUCTURE
-- =======================================================
-- Vision: High-frequency real-time dashboard with Google-only Auth and RLS.

-- 1. Custom Types & Enums
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_status') THEN
        CREATE TYPE match_status AS ENUM ('live', 'scheduled', 'finished');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bet_type') THEN
        CREATE TYPE bet_type AS ENUM ('6', '4', 'wicket', 'dot', 'other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prediction_outcome') THEN
        CREATE TYPE prediction_outcome AS ENUM ('pending', 'won', 'lost');
    END IF;
END $$;

-- 2. Tables

-- Profiles: Linked to Supabase Auth Users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  fan_coins bigint DEFAULT 1000,
  avatar_url text,
  hype_level int DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

-- Matches: Live Game Data
CREATE TABLE IF NOT EXISTS public.matches (
  id text PRIMARY KEY,
  team_a text NOT NULL,
  team_b text NOT NULL,
  win_prob_a float DEFAULT 0.5,
  win_prob_b float DEFAULT 0.5,
  current_momentum_json jsonb DEFAULT '{"history": []}'::jsonb, -- Stores wave graph history
  status match_status DEFAULT 'scheduled',
  created_at timestamp with time zone DEFAULT now()
);

-- Predictions: The Gaming/Betting Engine
CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  match_id text REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  ball_index int NOT NULL, -- Mandatory to prevent late-betting exploit
  bet_type bet_type NOT NULL,
  amount int DEFAULT 0,
  outcome prediction_outcome DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- Chat Messages: Community & AI Engagement
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  match_id text REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  sentiment_score float DEFAULT 0.5, -- Gemini-Pro Analysis
  is_hype_insight boolean DEFAULT false, -- Expert Analyzed Insights
  created_at timestamp with time zone DEFAULT now()
);

-- Global Match Hype: Aggregate Clicks
CREATE TABLE IF NOT EXISTS public.match_hype (
  match_id text PRIMARY KEY REFERENCES public.matches(id) ON DELETE CASCADE,
  team_a_clicks bigint DEFAULT 0,
  team_b_clicks bigint DEFAULT 0
);

-- 3. Row Level Security (RLS) Configuration

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_hype ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
-- Users can see all profiles, but only update their own
CREATE POLICY "Public Profiles Read-Access" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Matches Policies
-- Matches are public-read, but admin-only modification (simulated here)
CREATE POLICY "Matches Public Read-Access" ON public.matches FOR SELECT USING (true);

-- Predictions Policies
-- Users can see their own predictions and Insert them
CREATE POLICY "Users Read Own Predictions" ON public.predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users Insert Own Predictions" ON public.predictions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat Messages Policies
-- Public read, but users can only post as themselves
CREATE POLICY "Chat Public Read-Access" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Users Insert Chat Messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Match Hype Policies
-- Public read, public Update (clicks)
CREATE POLICY "Match Hype Public Read-Access" ON public.match_hype FOR SELECT USING (true);
CREATE POLICY "Hype Click Increments" ON public.match_hype FOR UPDATE USING (true);

-- 4. Realtime Configuration
-- Enable PostgreSQL Replication for high-frequency tables
BEGIN;
  -- Drop existing if exists to avoid errors on reapplying
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create publication for tables requiring real-time sync
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.matches, 
    public.match_hype, 
    public.chat_messages, 
    public.profiles;
COMMIT;

-- 5. Helper Triggers (Optional but Recommended)
-- Automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
