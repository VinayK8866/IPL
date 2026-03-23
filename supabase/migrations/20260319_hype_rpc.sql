-- RPC for High-Frequency Hype Increments
-- Ensures atomic updates to team click counts during rapid user interactions.
CREATE OR REPLACE FUNCTION increment_match_hype(p_match_id TEXT, p_team TEXT)
RETURNS VOID AS $$
BEGIN
  IF p_team = 'team_a' THEN
    UPDATE public.match_hype 
    SET team_a_clicks = team_a_clicks + 1 
    WHERE match_id = p_match_id;
  ELSE
    UPDATE public.match_hype 
    SET team_b_clicks = team_b_clicks + 1 
    WHERE match_id = p_match_id;
  END IF;

  -- Create record if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO public.match_hype (match_id, team_a_clicks, team_b_clicks)
    VALUES (
      p_match_id, 
      CASE WHEN p_team = 'team_a' THEN 1 ELSE 0 END,
      CASE WHEN p_team = 'team_b' THEN 1 ELSE 0 END
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
