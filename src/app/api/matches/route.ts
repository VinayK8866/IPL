import { NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '@/lib/supabaseClient';

// Track ball states in-memory for this serverless instance (limited but helpful for the active request)
const matchStates: Record<string, number> = {};

async function resolveBetsForMatch(matchId: string, seriesId: string) {
    if (!supabase) return;

    try {
        const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${matchId}`;
        const response = await axios.get(summaryUrl, { timeout: 8000 });
        const plays = response.data.plays || {};
        
        const playKeys = Object.keys(plays);
        if (playKeys.length === 0) return;
        
        const latestPlayKey = playKeys.sort((a, b) => plays[b].sequence - plays[a].sequence)[0];
        const play = plays[latestPlayKey];
        
        if (!play || !play.over) return;

        const ballIndex = (play.over.number - 1) * 6 + play.over.ball;
        
        let outcome = 'other';
        if (play.dismissal && play.dismissal.dismissal) outcome = 'wicket';
        else if (play.scoreValue === 6) outcome = '6';
        else if (play.scoreValue === 4) outcome = '4';
        else if (play.scoreValue === 0 && !play.innings?.wides && !play.innings?.noBalls) outcome = 'dot';

        if (matchStates[matchId] !== ballIndex) {
            console.log(`[Resolution] Match ${matchId} Ball ${ballIndex} Outcome: ${outcome}`);
            
            await supabase.rpc('resolve_predictions', {
                p_match_id: matchId,
                p_ball_index: ballIndex,
                p_outcome: outcome
            });
            matchStates[matchId] = ballIndex;
        }
    } catch (err: any) {
        console.error(`[Resolution API] Failed:`, err.message);
    }
}

async function upsertMatchToSupabase(match: any) {
    if (!supabase || !supabase.from) return;
    
    try {
        await supabase
            .from('matches')
            .upsert({
                id: match.id,
                team_a: match.teamA.name,
                team_b: match.teamB.name,
                status: (match.status || 'scheduled').toLowerCase(),
                win_prob_a: match.winProbA || 0.5,
                win_prob_b: match.winProbB || 0.5,
                // jsonb column for current_momentum_json can store extra metadata if needed
            });
    } catch (err: any) {
        console.error(`[Supabase API Sync] Error:`, err.message);
    }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchIdParam = searchParams.get('id');
  const SERIES_IDS = ['1510719', '8048', '1527930', '1508731'];
  
  try {
    const fetchPromises = SERIES_IDS.map(id => 
        axios.get(`https://site.api.espn.com/apis/site/v2/sports/cricket/${id}/scoreboard?t=${Date.now()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 8000
        }).catch(err => {
            console.error(`[API ERROR] Series ${id}:`, err.message);
            return { data: { events: [] } };
        })
    );

    const responses = await Promise.all(fetchPromises);
    const allMatches: any[] = [];

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
            const summaryText = status.summary || '';
            
            let mappedStatus: 'LIVE' | 'RESULT' | 'UPCOMING' = 'UPCOMING';
            if (state === 'in') mappedStatus = 'LIVE';
            else if (state === 'post') mappedStatus = 'RESULT';

            const team1 = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
            const team2 = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

            if (!team1 || !team2) continue;

            const uniqueId = `${seriesId}-${event.id}`;
            
            // If filtering by ID, skip others
            if (matchIdParam && uniqueId !== matchIdParam && event.id !== matchIdParam) continue;

            let matchObj: any = {
                id: uniqueId,
                originalId: event.id,
                name: event.name || `${team1.team?.displayName} vs ${team2.team?.displayName}`,
                series: seriesName,
                status: mappedStatus,
                statusText: summaryText || detail || status.type?.description || '',
                viewLink: event.links?.[0]?.href || '#',
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
                },
                over_limit: event.competitions?.[0]?.overLimit || 20,
                winProbA: team1.curatedRank === '1' ? 0.6 : 0.4,
                winProbB: team2.curatedRank === '1' ? 0.6 : 0.4,
                batters: [],
                bowlers: [],
                last_balls: [],
                live_commentary: []
            };

            // FETCH EXTENDED DATA FOR LIVE MATCHES
            if (mappedStatus === 'LIVE') {
                try {
                    const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${event.id}&t=${Date.now()}`;
                    const summaryRes = await axios.get(summaryUrl, { timeout: 5000 });
                    const summaryData = summaryRes.data;

                    if (summaryData.event?.competitions?.[0]?.overLimit) {
                        matchObj.over_limit = summaryData.event.competitions[0].overLimit;
                    }
                    
                    // 1. Commentary & Last Balls
                    const plays = summaryData.plays || [];

                    // Also pull from rosters for wickets
                    const commentary: any[] = [];
                    const rosters = summaryData.rosters || [];
                    rosters.forEach((roster: any) => {
                        (roster.roster || []).forEach((player: any) => {
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

                    const playEvents = plays.slice(0, 10).map((p: any) => ({
                        over: p.over?.number || '0',
                        ball: p.over?.ball + ': ' + (p.title || p.text || ''),
                        type: p.dismissal ? 'wicket' : (p.scoreValue === 6 ? 'six' : (p.scoreValue === 4 ? 'four' : 'normal'))
                    }));

                    matchObj.live_commentary = [...commentary, ...playEvents].sort((a: any, b: any) => parseFloat(b.over) - parseFloat(a.over)).slice(0, 15);

                    matchObj.last_balls = plays.slice(0, 6).map((p: any, idx: number) => {
                        const text = (p.text || '').toLowerCase();
                        let x = 0.5; // Middle
                        let y = 0.6; // Good length
                        
                        // JUGAAD: Parse commentary for real-derived coordinates
                        if (text.includes('outside off') || text.includes('width')) x = 0.8;
                        else if (text.includes('leg stump') || text.includes('pads') || text.includes('down leg')) x = 0.2;
                        
                        if (text.includes('short') || text.includes('bounced')) y = 0.3;
                        else if (text.includes('full') || text.includes('half volley')) y = 0.8;
                        else if (text.includes('yorker')) y = 1.0;
                        
                        // Wagon Wheel Angle (stored in z for delivery map, or we can use another field)
                        let angle = 0;
                        if (text.includes('cover') || text.includes('point')) angle = 135;
                        else if (text.includes('mid-off') || text.includes('long-off')) angle = 180;
                        else if (text.includes('mid-on') || text.includes('long-on')) angle = 0;
                        else if (text.includes('mid-wicket') || text.includes('square leg')) angle = 45;
                        else if (text.includes('fine leg')) angle = 20;

                        return {
                            x, 
                            y, 
                            z: angle, // Using z to pass angle to WagonWheel for now
                            type: p.scoreValue >= 4 ? 'pace' : 'spin',
                            is_wicket: !!p.dismissal,
                            timestamp: new Date(Date.now() - idx * 60000).toISOString()
                        };
                    });

                    // 2. Active Batters/Bowlers from Situation
                    const situ = summaryData.situation;
                    if (situ) {
                        const b1 = situ.batter1 ? { 
                            name: situ.batter1.athlete?.displayName || 'Batter 1', 
                            runs: situ.batter1.runs || 0, 
                            balls: situ.batter1.balls || 0, 
                            fours: 0, sixes: 0, 
                            strikeRate: (situ.batter1.runs / (situ.batter1.balls || 1)) * 100,
                            isBatting: true 
                        } : null;
                        const b2 = situ.batter2 ? { 
                            name: situ.batter2.athlete?.displayName || 'Batter 2', 
                            runs: situ.batter2.runs || 0, 
                            balls: situ.batter2.balls || 0, 
                            fours: 0, sixes: 0, 
                            strikeRate: (situ.batter2.runs / (situ.batter2.balls || 1)) * 100,
                            isBatting: false 
                        } : null;
                        
                        matchObj.batters = [b1, b2].filter(Boolean);
                        
                        if (situ.bowler1) {
                            matchObj.bowlers = [{
                                name: situ.bowler1.athlete?.displayName || 'Bowler',
                                overs: situ.bowler1.overs || 0,
                                maidens: 0,
                                runs: situ.bowler1.conceded || 0,
                                wickets: situ.bowler1.wickets || 0,
                                economy: (situ.bowler1.conceded / (situ.bowler1.overs || 1)) || 0
                            }];
                        }
                    }
                    
                    // CRR & Prediction
                    const t1_score_str = team1.score?.split('/')[0] || '0';
                    const t2_score_str = team2.score?.split('/')[0] || '0';
                    const t1_score = parseInt(t1_score_str) || 0;
                    const t2_score = parseInt(t2_score_str) || 0;
                    const ovStr = (team1.linescores?.[0]?.displayValue || team2.linescores?.[0]?.displayValue || '0.1').toString();
                    const parts = ovStr.split('.');
                    const totalBalls = (parseInt(parts[0]) * 6) + (parseInt(parts[1] || '0'));
                    const crrValue = (Math.max(t1_score, t2_score) / (Math.max(1, totalBalls) / 6)) || 0;
                    matchObj.crr = parseFloat(crrValue.toFixed(2));
                    matchObj.predictedScore = Math.round(crrValue * 20);

                } catch (e) {
                    console.warn(`[API Extended] Failed for ${event.id}`);
                }
            }

            // SYNC TO SUPABASE (FREE PERSISTENCE)
            await upsertMatchToSupabase(matchObj);
            
            // RESOLVE BETS IF LIVE
            if (mappedStatus === 'LIVE') {
                await resolveBetsForMatch(matchObj.originalId || matchObj.id, seriesId);
            }

            allMatches.push(matchObj);
        }
    }

    // FINAL DEDUPLICATION
    const uniqueMatches = Array.from(new Map(allMatches.map(m => [m.id, m])).values());

    if (matchIdParam && uniqueMatches.length > 0) {
        return NextResponse.json(uniqueMatches[0]);
    }

    const sortedMatches = uniqueMatches.sort((a, b) => {
        const order = { 'LIVE': 0, 'UPCOMING': 1, 'RESULT': 2 };
        return order[a.status as keyof typeof order] - order[b.status as keyof typeof order];
    });

    return NextResponse.json({ matches: sortedMatches, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('[GLOBAL API ERROR]', err.message);
    return NextResponse.json({ matches: [], error: err.message }, { status: 500 });
  }
}


