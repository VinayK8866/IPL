import axios from 'axios';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PROJECT CRICKET PULSE - LIVE SCRAPER WORKER
 * Vision: High-frequency 'Jugaad' scraping with state deduplication.
 */

// 1. Supabase Service Role Client (for admin-level write access)
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Target Match Configuration (Placeholder - In production, this would be dynamic)
const TARGET_MATCH_ID = 'match_12345';
const PUBLIC_JSON_ENDPOINT = 'https://api.espncricinfo.com/v1/pages/match/scorecard?matchId=12345';

// 2. In-Memory State for Deduplication
let lastSeenMatchState: string | null = null;
let isScraping = false; // Execution lock to prevent overlapping runs

// Transformation Function: Raw JSON -> Internal 'matches' Schema
function transformMatchData(rawData: any, commentary: any[]) {
  // Mock logic for mapping (based on typical Cricinfo data structure)
  const match = rawData?.match || {};
  const live = rawData?.live || {};
  
  // Calculate win probabilities & momentum (simulated based on CRR/RRR)
  const scoreA = live.scoreA || 150;
  const scoreB = live.scoreB || 140;
  const totalWeight = scoreA + scoreB;
  
  const win_prob_a = parseFloat((scoreA / totalWeight).toFixed(2));
  const win_prob_b = 1 - win_prob_a;

  return {
    id: TARGET_MATCH_ID,
    team_a: match.teamA || 'LSG',
    team_b: match.teamB || 'KKR',
    win_prob_a,
    win_prob_b,
    current_momentum_json: {
      history: [win_prob_a, Math.random()], // Simulated momentum shift
      last_ball: live.lastBall || '4'
    },
    live_commentary: commentary, // NEW: Google Search Scraped Data
    status: 'live' as const
  };
}

// Helper: Simulating a Google Search Commentary Scraper (free 'jugaad' source)
async function scrapeGoogleCommentary() {
    // This would typically use Puppeteer/Playwright in production to scrape the 
    // Google 'Cricket Scorecard' -> 'Commentary' tab
    // For this autonomous hub, we simulate ball-by-ball text.
    return [
        { over: '18.4', ball: 'Stoinis goes big! Smashed over long-on for SIX!', type: 'six' },
        { over: '18.3', ball: 'Low full toss, pushed to deep mid-wicket for a single.', type: 'one' },
        { over: '18.2', ball: 'OUT! Chahal strikes! Leading edge caught by long-off.', type: 'wicket' }
    ];
}

// Scrape function called every 2s
async function performScrape() {
  if (isScraping) {
    console.log('[DEBUG] Scrape already in progress, skipping...');
    return;
  }

  isScraping = true;
  console.log(`[${new Date().toISOString()}] Initiating Scrape (JSON + Google Commentary)...`);

  try {
    // 1. Fetch Scoreboard Data
    const response = await axios.get(PUBLIC_JSON_ENDPOINT, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.google.com/search?q=IPL+Live+Score'
      },
      timeout: 1500
    });

    // 2. Fetch/Simulate Google Commentary
    const commentary = await scrapeGoogleCommentary();
    const rawData = response.data;
    const currentStateString = JSON.stringify({ rawData, commentary });

    // 4. In-Memory Deduplication
    if (currentStateString === lastSeenMatchState) {
      console.log('[DEDUPE] State unchanged. Skipping DB update.');
      isScraping = false;
      return;
    }

    lastSeenMatchState = currentStateString;
    console.log('[DETECTION] New state detected! Processing Commentary + Stats...');

    const transformed = transformMatchData(rawData, commentary);

    // Update Supabase
    const { error } = await supabase
      .from('matches')
      .upsert(transformed);

    if (error) {
      console.error('[DB ERROR] Upsert failed:', error.message);
    } else {
      console.log('[SYNC] Match Hub updated: Commentary + Live Momentum broadcasted.');
    }

  } catch (error: any) {
    console.error('[ERROR] Scraper cycle failed:', error.message);
  } finally {
    isScraping = false;
  }
}

// 6. Node-Cron Schedule: Every 2 Seconds
// Note: Standard cron limited to 1m, so we use setInterval for sub-minute 'jugaad' logic or 
// if using a cron lib supporting seconds:
console.log('--- CRICKET PULSE WORKER STARTING (2s INTERVAL) ---');

// High-speed heart-beat
setInterval(performScrape, 2000);

// We still keep a cron block for hourly health checks/restarts
cron.schedule('0 * * * *', () => {
    console.log('[SERVICE] Hourly health check - Scraper is active.');
});
