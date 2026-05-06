-- UPDATE SCRAPED SCORES TABLE FOR RICH DATA
-- Adding columns for full scorecard and commentary
-- Run this in your Supabase SQL Editor

ALTER TABLE public.scraped_scores 
ADD COLUMN IF NOT EXISTS scorecard_json jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS commentary_json jsonb DEFAULT '[]'::jsonb;

-- Update comments
COMMENT ON COLUMN public.scraped_scores.scorecard_json IS 'Full scorecard data: [{team, batting:[], bowling:[], total:{}}]';
COMMENT ON COLUMN public.scraped_scores.commentary_json IS 'Ball-by-ball history: [{over, run, text, type}]';
