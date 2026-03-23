const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { broadcastMatchData } = require('../src/lib/data-engine/websocket_relay.js');
require('dotenv').config({ path: '.env.local' });

// --- CONFIGURATION ---
const SERIES_ID = process.env.SCRAPE_SERIES_ID || "1527930"; // Men's PM Cup 2026
const SCRAPE_MATCH_ID = process.env.SCRAPE_MATCH_ID || "1527935"; // Lumbini vs Koshi
const TARGET_MATCH_ID = process.env.NEXT_PUBLIC_DEFAULT_MATCH_ID || "lsg-vs-kkr-2024-01";
const SCRAPE_INTERVAL = parseInt(process.env.SCRAPE_INTERVAL || "2000", 10);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ENDPOINT = `https://hs-consumer-api.espncricinfo.com/v1/pages/match/scorecard?lang=en&seriesId=${SERIES_ID}&matchId=${SCRAPE_MATCH_ID}`;

let lastBallHash = '';
let isShuttingDown = false;

/**
 * Transformation Function: Raw API JSON -> Cricket Pulse Schema
 */
function transformMatchData(rawData) {
  const match = rawData?.match || {};
  const teams = rawData?.content?.scorecard?.teams || [];
  const live = rawData?.content?.matchScorecard?.live || {};
  const innings = rawData?.content?.scorecard?.innings || [];
  
  // Extract Score & Overs
  const currentInnings = innings[innings.length - 1] || {};
  const score = `${currentInnings.runs || 0}/${currentInnings.wickets || 0}`;
  const overs = currentInnings.overs || 0;

  // Extract Teams
  const teamA = teams[0]?.team?.abbreviation || 'TBA';
  const teamB = teams[1]?.team?.abbreviation || 'TBA';

  // [PROD NOTE] Win Prob would ideally come from a real model or match API field
  // For now, we calculate a stable but dynamic prob based on CRR
  const crr = currentInnings.runRate || 0;
  const win_prob_a = Math.min(0.9, Math.max(0.1, 0.5 + (crr - 6) * 0.05)); 
  const win_prob_b = 1 - win_prob_a;

  // Map Batters
  const currentBatters = rawData?.content?.matchScorecard?.matchPlayers?.batting || [];
  const batters = currentBatters.map(b => ({
    name: b.player.longName,
    runs: b.runs,
    balls: b.balls,
    strikeRate: b.strikeRate,
    fours: b.fours,
    sixes: b.sixes
  })).slice(0, 2);

  // Map Bowlers
  const currentBowlers = rawData?.content?.matchScorecard?.matchPlayers?.bowling || [];
  const bowlers = currentBowlers.map(b => ({
    name: b.player.longName,
    overs: b.overs,
    maidens: b.maidens,
    runs: b.runs,
    wickets: b.wickets,
    economy: b.economy
  })).slice(0, 1);

  return {
    match_id: TARGET_MATCH_ID,
    team_a: teamA,
    team_b: teamB,
    score,
    overs: overs.toString(),
    crr,
    win_prob_a,
    win_prob_b,
    batters: batters.length > 0 ? batters : [
        { name: 'Waiting...', runs: 0, balls: 0, strikeRate: 0, fours: 0, sixes: 0 },
        { name: 'Waiting...', runs: 0, balls: 0, strikeRate: 0, fours: 0, sixes: 0 }
    ],
    bowlers: bowlers.length > 0 ? bowlers : [
        { name: 'Waiting...', overs: 0, maidens: 0, runs: 0, wickets: 0, economy: 0 }
    ],
    // [PROD NOTE] REAL Telemetry data would be mapped here
    last_balls: [
      { x: Math.random() * 0.2 + 0.4, y: Math.random() * 0.4 + 0.3, z: 0.1, type: 'pace', is_wicket: false, timestamp: Date.now().toString() }
    ],
    timestamp: new Date().toISOString()
  };
}

async function scrapeScorecard() {
  if (isShuttingDown) return;

  try {
    const response = await axios.get(ENDPOINT, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 5000
    });

    if (!response.data) throw new Error('Empty API Response');

    const matchData = transformMatchData(response.data);
    const ballHash = `${matchData.score}-${matchData.overs}-${matchData.batters[0]?.runs}`;

    if (ballHash !== lastBallHash) {
      console.log(`[${new Date().toISOString()}] NEW STATE: ${matchData.score} (Overs: ${matchData.overs})`);
      lastBallHash = ballHash;

      // 1. Update Supabase
      const { error } = await supabase
        .from('matches')
        .upsert({
          id: TARGET_MATCH_ID,
          team_a: matchData.team_a,
          team_b: matchData.team_b,
          win_prob_a: Number(matchData.win_prob_a.toFixed(2)),
          win_prob_b: Number(matchData.win_prob_b.toFixed(2)),
          current_momentum_json: { history: [matchData.win_prob_a], last_ball: '0' },
          status: 'live'
        }, { onConflict: 'id' });

      if (error) console.error('[Supabase] Update Error:', error.message);

      // 2. Broadcast to Socket Relay
      broadcastMatchData(matchData);
    }

  } catch (err) {
    console.error(`[Scraper] Failed: ${err.message}`);
    if (err.response?.status === 403) {
        console.error('[Critical] Access Denied (403). EPSNCricinfo might be rate-limiting.');
    }
  }
}

// --- INITIALIZATION ---
console.log('--- CRICKET PULSE REAL-TIME ENGINE STARTING ---');
console.log(`[Config] Series: ${SERIES_ID}, Match: ${SCRAPE_MATCH_ID}`);
console.log(`[Config] Frequency: Every ${SCRAPE_INTERVAL}ms`);

scrapeScorecard();
const ticker = setInterval(scrapeScorecard, SCRAPE_INTERVAL);

// --- GRACEFUL SHUTDOWN ---
process.on('SIGINT', () => {
    console.log('\n[Engine] Shutting down gracefully...');
    isShuttingDown = true;
    clearInterval(ticker);
    process.exit(0);
});

