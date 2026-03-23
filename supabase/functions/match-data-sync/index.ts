import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

/**
 * PROJECT CRICKET PULSE - MATCH DATA SYNC & PREDICTION RESOLUTION
 * 
 * Triggered by the high-frequency scraper cron.
 * Ingests live ball-by-ball data and resolves user predictions atomically.
 */

serve(async (req) => {
  try {
    const { match_id, ball_index, outcome_type } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. ATOMIC RESOLUTION: Credit winners and lock the ball index
    // Calls the PL/pgSQL function developed in Step 9
    const { data, error } = await supabaseAdmin.rpc('resolve_prediction', {
      p_match_id: match_id,
      p_ball_index: ball_index,
      p_resolved_outcome: outcome_type
    });

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      resolved_index: ball_index,
      outcome: outcome_type 
    }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
});
