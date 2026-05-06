-- UPDATE SCRAPED SCORES TABLE FOR DETAILED STATS
-- Adding JSONB columns to store rich match data (batters, bowlers, last balls)
-- to align with the CricketPulse dashboard.

ALTER TABLE public.scraped_scores 
ADD COLUMN IF NOT EXISTS batters_json jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS bowlers_json jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_balls_json jsonb DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.scraped_scores.batters_json IS 'Stores array of current batters: [{name, runs, balls, fours, sixes, sr}]';
COMMENT ON COLUMN public.scraped_scores.bowlers_json IS 'Stores array of current bowlers: [{name, overs, runs, wickets, econ}]';
COMMENT ON COLUMN public.scraped_scores.last_balls_json IS 'Stores array of recent balls: [{value, is_wicket}]';
