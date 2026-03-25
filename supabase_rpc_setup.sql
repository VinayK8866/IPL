-- RPC to increment match hype atomically
CREATE OR REPLACE FUNCTION increment_match_hype(p_match_id TEXT, p_team TEXT) 
RETURNS VOID AS $$
BEGIN
  -- Insert missing matches if they don't exist
  INSERT INTO match_hype (match_id, team_a_clicks, team_b_clicks)
  VALUES (p_match_id, 0, 0)
  ON CONFLICT (match_id) DO NOTHING;

  IF p_team = 'team_a' THEN
    UPDATE match_hype
    SET team_a_clicks = team_a_clicks + 1
    WHERE match_id = p_match_id;
  ELSIF p_team = 'team_b' THEN
    UPDATE match_hype
    SET team_b_clicks = team_b_clicks + 1
    WHERE match_id = p_match_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to resolve predictions for a specific ball
CREATE OR REPLACE FUNCTION resolve_predictions(p_match_id TEXT, p_ball_index INT, p_outcome TEXT)
RETURNS VOID AS $$
DECLARE
  v_bet RECORD;
BEGIN
  -- 1. Update all pending predictions for this ball
  FOR v_bet IN 
    UPDATE predictions
    SET outcome = CASE WHEN bet_type::text = p_outcome THEN 'won'::prediction_outcome ELSE 'lost'::prediction_outcome END
    WHERE match_id = p_match_id AND ball_index = p_ball_index AND outcome = 'pending'
    RETURNING id, user_id, amount, bet_type
  LOOP
    -- 2. If won, update user balance
    IF v_bet.bet_type::text = p_outcome THEN
      UPDATE profiles
      SET fan_coins = fan_coins + (v_bet.amount * 2) 
      WHERE id = v_bet.user_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime for match_hype if not already enabled
-- (This might fail if the user doesn't have permissions, but good as a guide)
ALTER PUBLICATION supabase_realtime ADD TABLE match_hype;
