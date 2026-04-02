const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { broadcastMatchData } = require('../src/lib/data-engine/websocket_relay.js');
require('dotenv').config({ path: '.env.local' });

// --- CONFIGURATION ---
const SERIES_ID = process.env.SCRAPE_SERIES_ID || "1510719"; // IPL 2026
const SCRAPE_MATCH_ID = process.env.SCRAPE_MATCH_ID || "1527674"; // RCB vs SRH opening match
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


const SERIES_IDS = ['1510719', '8048', '1527930', '1508731'];

let isShuttingDown = false;

const matchStates = {}; // Track last resolved ball_index per match

async function resolveBetsForMatch(matchId, seriesId, currentOvers) {
    if (!supabase) return;

    try {
        // --- 1. RESOLVE PREDICTIONS ---
        const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${matchId}`;
        const response = await axios.get(summaryUrl, { timeout: 10000 });
        const plays = response.data.plays || {};
        
        // Get the most recent play by finding the max sequence
        const playKeys = Object.keys(plays);
        if (playKeys.length === 0) return;
        
        const latestPlayKey = playKeys.sort((a, b) => plays[b].sequence - plays[a].sequence)[0];
        const play = plays[latestPlayKey];
        
        if (!play || !play.over) return;

        // Calculate ball index: (over - 1) * 6 + ball
        const ballIndex = (play.over.number - 1) * 6 + play.over.ball;
        
        // Detect outcome
        let outcome = 'other';
        if (play.dismissal && play.dismissal.dismissal) outcome = 'wicket';
        else if (play.scoreValue === 6) outcome = '6';
        else if (play.scoreValue === 4) outcome = '4';
        else if (play.scoreValue === 0 && !play.innings.wides && !play.innings.noBalls) outcome = 'dot';

        // Only resolve if it's a new ball
        if (matchStates[matchId] !== ballIndex) {
            console.log(`[Resolution] Match ${matchId} Ball ${ballIndex} Outcome: ${outcome}`);
            
            const { error } = await supabase.rpc('resolve_predictions', {
                p_match_id: matchId,
                p_ball_index: ballIndex,
                p_outcome: outcome
            });

            if (error) console.error(`[Resolution] Error resolving match ${matchId}:`, error.message);
            else matchStates[matchId] = ballIndex;
        }

    } catch (err) {
        console.error(`[Resolution] Failed to fetch summary for ${matchId}:`, err.message);
    }
}

async function upsertMatchToSupabase(match) {
    if (!supabase) return;
    
    try {
        // Map scraper format to Supabase schema
        const oversStr = match.teamA.isBatting ? match.teamA.overs : (match.teamB.overs || '0.0');
        const oversSplit = oversStr.split('.');
        const current_ball_index = (parseInt(oversSplit[0] || '0') * 6) + (parseInt(oversSplit[1] || '0'));

        const { error } = await supabase
            .from('matches')
            .upsert({
                id: match.id,
                team_a: match.teamA.name,
                team_b: match.teamB.name,
                score: match.teamA.isBatting ? match.teamA.score : match.teamB.score,
                overs: oversStr,
                crr: match.crr || 0,
                status: match.status.toLowerCase(),
                win_prob_a: match.winProbA || 0.5,
                win_prob_b: match.winProbB || 0.5,
                batters: match.batters || [],
                bowlers: match.bowlers || [],
                live_commentary: match.live_commentary || [],
                last_balls: match.last_balls || [],
                current_ball_index: current_ball_index
            });
            
        if (error) console.error(`[Supabase] Match Update failed:`, error.message);
    } catch (err) {
        console.error(`[Supabase] Sync Error:`, err.message);
    }
}

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

    for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        const seriesId = SERIES_IDS[i];
        const data = response.data;
        const events = data.events || [];
        const seriesName = data.leagues?.[0]?.name || (seriesId === '8048' ? 'Indian Premier League' : 'International');

        for (const event of events) {
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

            if (!team1 || !team2) continue;

            const matchId = event.id || Math.random().toString();
            
            // LOG RAW DATA FOR DEBUGGING
            if (matchId === SCRAPE_MATCH_ID) {
                console.log(`[DEBUG] Match ${matchId} Team1 linescores:`, JSON.stringify(team1.linescores || [], null, 2));
                console.log(`[DEBUG] Match ${matchId} Team2 linescores:`, JSON.stringify(team2.linescores || [], null, 2));
            }

            const teamA_overs = team1.linescores?.[0]?.displayValue || '';
            const teamB_overs = team2.linescores?.[0]?.displayValue || '';
            const currentOvers = mappedStatus === 'LIVE' ? (teamA_overs || teamB_overs) : '';

            // TRIGGER RESOLUTION FOR LIVE MATCHES
            if (mappedStatus === 'LIVE') {
                await resolveBetsForMatch(matchId, seriesId, currentOvers);
            }

            const teamA_score_raw = team1.score || '0';
            const teamB_score_raw = team2.score || '0';
            const teamA_score_val = parseInt(teamA_score_raw.split('/')[0]) || 0;
            const teamB_score_val = parseInt(teamB_score_raw.split('/')[0]) || 0;
            
            // Calculate CRR with robust parsing and sanity check
            const parseOvers = (ovStr) => {
                if (!ovStr) return 0;
                const parts = ovStr.toString().split('.');
                const overs = parseInt(parts[0], 10) || 0;
                const balls = parts.length > 1 ? (parseInt(parts[1], 10) || 0) : 0;
                const totalBalls = (overs * 6) + balls;
                return totalBalls / 6;
            };

            const currentOversFloat = parseOvers(teamA_overs || teamB_overs || '0.1');
            const battingScore = team1.curatedRank === '1' ? teamA_score_val : teamB_score_val;
            
            // Standard CRR calculation with 1-ball minimum to avoid infinity
            let crr = 0;
            if (currentOversFloat > 0.05) { // At least 1 ball bowled
                crr = battingScore / currentOversFloat;
            }

            // Sanity cap: No team runs at 50 RPO in a standard match context
            if (crr > 36) crr = 36; 

            const predictedScore = Math.round(crr * 20);

            // --- NEW: Fetch Commentary & Situation for all active matches ---
            let live_commentary = [];
            let batters = [];
            let bowlers = [];

            // Only fetch deeper data for LIVE matches to save credits/rate-limits
            const isLive = mappedStatus === 'LIVE';
            let overLimit = event.competitions?.[0]?.overLimit || 20;

            if (isLive) {
                try {
                    const sumUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${matchId}&t=${Date.now()}`;
                    const sumRes = await axios.get(sumUrl);
                    const summaryData = sumRes.data;

                    if (summaryData.event?.competitions?.[0]?.overLimit) {
                        overLimit = summaryData.event.competitions[0].overLimit;
                    }

                    // 1. Commentary (from plays + rosters)
                    const plays = summaryData.plays || [];
                    const playEvents = (plays || []).slice(0, 10).map(p => {
                        let type = 'normal';
                        let scoreVal = p.scoreValue || 0;
                        if (p.dismissal) type = 'wicket';
                        else if (scoreVal === 6) type = 'six';
                        else if (scoreVal === 4) type = 'four';
                        else if (scoreVal === 0) type = 'dot';
                        else if (scoreVal > 0) type = 'runs';

                        return {
                            over: p.over?.number || '0',
                            ball: p.over?.ball + ': ' + (p.title || p.text || ''),
                            type: type,
                            runs: scoreVal
                        };
                    });

                    // 1b. Roster dismissals for wickets
                    const commentary = [];
                    const rosters = summaryData.rosters || [];
                    rosters.forEach((roster) => {
                        (roster.roster || []).forEach((player) => {
                            const ls = player.linescores?.[0];
                            const outDetails = ls?.statistics?.batting?.outDetails;
                            if (outDetails?.details?.text) {
                                commentary.push({
                                    over: String(outDetails.details.over?.overs || ''),
                                    ball: `🏏 OUT! ${outDetails.details.shortText} — ${outDetails.details.text}`,
                                    type: 'wicket'
                                });
                            }
                        });
                    });

                    live_commentary = [...commentary, ...playEvents].sort((a, b) => parseFloat(b.over) - parseFloat(a.over)).slice(0, 15);

                    // 2. Batters & Bowlers (SITUATION DATA)
                    const situ = summaryData.situation;
                    if (situ) {
                        if (situ.batter1) {
                            batters.push({
                                name: situ.batter1.athlete?.displayName || 'Batter 1',
                                runs: situ.batter1.runs || 0,
                                balls: situ.batter1.balls || 0,
                                fours: 0, sixes: 0,
                                strikeRate: (situ.batter1.runs / (situ.batter1.balls || 1)) * 100,
                                isBatting: true
                            });
                        }
                        if (situ.batter2) {
                            batters.push({
                                name: situ.batter2.athlete?.displayName || 'Batter 2',
                                runs: situ.batter2.runs || 0,
                                balls: situ.batter2.balls || 0,
                                fours: 0, sixes: 0,
                                strikeRate: (situ.batter2.runs / (situ.batter2.balls || 1)) * 100,
                                isBatting: false
                            });
                        }
                        if (situ.bowler1) {
                            bowlers.push({
                                name: situ.bowler1.athlete?.displayName || 'Bowler',
                                overs: situ.bowler1.overs || 0,
                                runs: situ.bowler1.conceded || 0,
                                wickets: situ.bowler1.wickets || 0
                            });
                        }
                    }
                } catch (e) {
                    console.warn(`[Scraper] Commentary/Situation fetch failed for ${matchId}`);
                }
            }

                const matchObj = {
                    id: matchId,
                    name: event.name || `${team1.team?.displayName} vs ${team2.team?.displayName}`,
                    series: seriesName,
                    status: mappedStatus,
                    statusText: summary || detail || status.type?.description || '',
                    live_commentary: live_commentary,
                    last_balls: live_commentary.map(p => ({
                        runs: p.type === 'four' ? 4 : (p.type === 'six' ? 6 : 0),
                        outcome: p.type
                    })),
                    batters: batters,
                    bowlers: bowlers,
                teamA: {
                    name: team1.team?.displayName || team1.team?.shortDisplayName || 'TBA',
                    score: team1.score || '',
                    overs: teamA_overs,
                    isBatting: team1.curatedRank?.toString() === '1'
                },
                teamB: {
                    name: team2.team?.displayName || team2.team?.shortDisplayName || 'TBA',
                    score: team2.score || '',
                    overs: teamB_overs,
                    isBatting: team2.curatedRank?.toString() === '2'
                },
                over_limit: overLimit,
                winProbA: team1.curatedRank === '1' ? 0.6 : 0.4,
                winProbB: team2.curatedRank === '1' ? 0.6 : 0.4,
                crr: parseFloat(crr.toFixed(2)),
                predictedScore: Math.round(crr * overLimit)
            };

            console.log(`[Scraper] Broadcasting Match: ${matchObj.name} (ID: ${matchObj.id}) CRR: ${matchObj.crr} Pred: ${matchObj.predictedScore}`);

            // SYNC TO SUPABASE FOR AI NARRATOR & TICKER
            await upsertMatchToSupabase(matchObj);
            console.log(`[Scraper] Broadcasting Match: ${matchObj.name} (ID: ${matchObj.id}) TeamA: ${matchObj.teamA.name}`);

            allMatches.push(matchObj);
        }
    }

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

