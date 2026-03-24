const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { broadcastMatchData } = require('../src/lib/data-engine/websocket_relay.js');
require('dotenv').config({ path: '.env.local' });

// --- CONFIGURATION ---
const SERIES_ID = process.env.SCRAPE_SERIES_ID || "1527930"; // Men's PM Cup 2026
const SCRAPE_MATCH_ID = process.env.SCRAPE_MATCH_ID || "1527935"; // Lumbini vs Koshi
const TARGET_MATCH_ID = process.env.NEXT_PUBLIC_DEFAULT_MATCH_ID || "lsg-vs-kkr-2024-01";
const SCRAPE_INTERVAL = parseInt(process.env.SCRAPE_INTERVAL || "2000", 10);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('[Supabase] Missing credentials. Persistence to DB disabled.');
}


const SERIES_IDS = ['8048', '1527930', '1508731'];

let isShuttingDown = false;

async function scrapeScores() {
  if (isShuttingDown) return;

  try {
    const fetchPromises = SERIES_IDS.map(id => 
        axios.get(`https://site.api.espn.com/apis/site/v2/sports/cricket/${id}/scoreboard?t=${Date.now()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        }).catch(err => {
            console.error(`[Scraper] Series ${id} fetch failed:`, err.message);
            return { data: { events: [] } };
        })
    );

    const responses = await Promise.all(fetchPromises);
    const allMatches = [];

    responses.forEach((response, idx) => {
        const data = response.data;
        const events = data.events || [];
        const seriesName = data.leagues?.[0]?.name || (SERIES_IDS[idx] === '8048' ? 'Indian Premier League' : 'International');

        const parsedMatches = events.map((event) => {
            const competitors = event.competitions?.[0]?.competitors || [];
            const status = event.status || {};
            const state = status.type?.state || 'pre';
            const detail = status.type?.shortDetail || status.type?.description || '';
            const summary = status.summary || '';
            
            let mappedStatus = 'UPCOMING';
            if (state === 'in') mappedStatus = 'LIVE';
            else if (state === 'post') mappedStatus = 'RESULT';

            const team1 = competitors.find(c => c.homeAway === 'home') || competitors[0];
            const team2 = competitors.find(c => c.homeAway === 'away') || competitors[1];

            if (!team1 || !team2) return null;

            return {
                id: event.id || Math.random().toString(),
                name: event.name || `${team1.team?.displayName} vs ${team2.team?.displayName}`,
                series: seriesName,
                status: mappedStatus,
                statusText: summary || detail || status.type?.description || '',
                teamA: {
                    name: team1.team?.displayName || team1.team?.shortDisplayName || 'TBA',
                    score: team1.score || '',
                    overs: team1.linescores?.[0]?.displayValue || '',
                    isBatting: team1.curatedRank?.toString() === '1'
                },
                teamB: {
                    name: team2.team?.displayName || team2.team?.shortDisplayName || 'TBA',
                    score: team2.score || '',
                    overs: team2.linescores?.[0]?.displayValue || '',
                    isBatting: team2.curatedRank?.toString() === '2'
                }
            };
        }).filter(Boolean);

        allMatches.push(...parsedMatches);
    });

    console.log(`[Scraper] Successfully parsed ${allMatches.length} total matches from multiple series.`);

    if (allMatches.length > 0) {
      // Sort matches so LIVE matches are broadcasted first (or just broadcast all)
      const sortedMatches = allMatches.sort((a, b) => {
          const order = { 'LIVE': 0, 'UPCOMING': 1, 'RESULT': 2 };
          return order[a.status] - order[b.status];
      });

      console.log(`[Relay] Broadcasting ${sortedMatches.length} matches to clients...`);
      broadcastMatchData({ matches: sortedMatches, timestamp: new Date().toISOString() });
    }

  } catch (err) {
    console.error(`[Scraper] Global fetch error: ${err.message}`);
  }
}



// Update initialization
console.log('--- ESPN LIVE SCORE SCRAPER STARTING ---');
scrapeScores();
const ticker = setInterval(scrapeScores, SCRAPE_INTERVAL); // Dynamic interval (2s by default)


// --- GRACEFUL SHUTDOWN ---
process.on('SIGINT', () => {
    console.log('\n[Engine] Shutting down gracefully...');
    isShuttingDown = true;
    clearInterval(ticker);
    process.exit(0);
});

