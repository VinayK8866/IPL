-- 1. Update Match State for Locking Logic
ALTER TABLE matches ADD COLUMN IF NOT EXISTS current_ball_index INT DEFAULT 0;

-- 2. Atomic Coin Transaction Function (The "Fan-Coins" Ledger)
-- Processes bets with server-side validation to prevent late-betting exploits.
CREATE OR REPLACE FUNCTION place_ball_prediction(
    p_user_id UUID,
    p_match_id TEXT,
    p_ball_index INT,
    p_bet_type bet_type,
    p_amount INT
) RETURNS JSONB AS $$
DECLARE
    v_locked_index INT;
    v_current_coins BIGINT;
    v_prediction_id UUID;
    v_response JSONB;
BEGIN
    -- ATOMIC LOCK: Row-level lock on the match to prevent race conditions during heavy betting cycles
    SELECT current_ball_index INTO v_locked_index 
    FROM matches 
    WHERE id = p_match_id 
    FOR SHARE;

    -- LATE BETTING LOCK: Compare against the actual data-feed progress
    -- Any bet for a ball index that has already been recorded is an exploit.
    IF p_ball_index <= v_locked_index THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'LATE_BETTING_EXPLOIT: Ball ' || p_ball_index || ' is already locked at index ' || v_locked_index
        );
    END IF;

    -- COIN BALANCE VALIDATION: Ensure user has sufficient funds (Server-side check)
    SELECT fan_coins INTO v_current_coins FROM profiles WHERE id = p_user_id FOR UPDATE;
    
    IF v_current_coins IS NULL OR v_current_coins < p_amount THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'INSUFFICIENT_FUNDS: Required ' || p_amount || ', available ' || COALESCE(v_current_coins, 0)
        );
    END IF;

    -- ATOMIC DEBIT
    UPDATE profiles SET fan_coins = fan_coins - p_amount WHERE id = p_user_id;

    -- INSERT PENDING PREDICTION
    INSERT INTO predictions (user_id, match_id, ball_index, bet_type, amount, outcome)
    VALUES (p_user_id, p_match_id, p_ball_index, p_bet_type, p_amount, 'pending')
    RETURNING id INTO v_prediction_id;

    RETURN jsonb_build_object(
        'success', true, 
        'prediction_id', v_prediction_id, 
        'new_balance', v_current_coins - p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Resolution RPC: Triggered by Edge Function upon match data sync
CREATE OR REPLACE FUNCTION resolve_prediction(
    p_match_id TEXT,
    p_ball_index INT,
    p_resolved_outcome bet_type
) RETURNS VOID AS $$
BEGIN
    -- 1. Bulk Update Profiles for winners (Multiplier: 4x for Wicket/6s, 2x for Dots/4s, etc.)
    -- Using a simplified rule for now: 3x reward across the board
    UPDATE profiles 
    SET fan_coins = fan_coins + (p.amount * 3)
    FROM predictions p
    WHERE p.user_id = profiles.id
      AND p.match_id = p_match_id
      AND p.ball_index = p_ball_index
      AND p.bet_type = p_resolved_outcome
      AND p.outcome = 'pending';

    -- 2. Mark Prediction Status
    UPDATE predictions 
    SET outcome = CASE 
        WHEN bet_type = p_resolved_outcome THEN 'won'::prediction_outcome 
        ELSE 'lost'::prediction_outcome 
    END
    WHERE match_id = p_match_id 
      AND ball_index = p_ball_index
      AND outcome = 'pending';

    -- 3. Move the match lock forward
    UPDATE matches SET current_ball_index = p_ball_index WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
