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
            
            // 1. Resolve individual bets
            await supabase.rpc('resolve_predictions', {
                p_match_id: matchId,
                p_ball_index: ballIndex,
                p_outcome: outcome
            });

            // 2. Update global match state for current ball lock
            await supabase.from('matches').update({
                current_ball_index: ballIndex,
                last_outcome: outcome
            }).eq('id', matchId);

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

            // Detect batting team from linescores
            const t1_isBatting = team1.linescores?.[0]?.isBatting === true;
            const t2_isBatting = team2.linescores?.[0]?.isBatting === true;

            // Parse clean score from compound strings like "162/6 (20 ov)"
            const parseCleanScore = (s: string) => {
                if (!s) return '';
                const m = s.match(/^(\d+\/\d+)/);
                return m ? m[1] : s.split(' ')[0];
            };

            // Get overs from linescores.overs field (NOT displayValue)
            const t1_overs = String(team1.linescores?.[0]?.overs || '');
            const t2_overs = String(team2.linescores?.[0]?.overs || '');

            // Also try to extract overs from the score string like "162/6 (20 ov)"
            const extractOversFromScore = (scoreStr: string) => {
                const m = scoreStr.match(/\((\d+\.?\d*)\//);
                if (m) return m[1];
                const m2 = scoreStr.match(/\((\d+\.?\d*)\s*ov/);
                return m2 ? m2[1] : '';
            };

            const t1_oversFromScore = extractOversFromScore(team1.score || '');
            const t2_oversFromScore = extractOversFromScore(team2.score || '');

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
                    overs: t1_oversFromScore || t1_overs,
                    isBatting: t1_isBatting
                },
                teamB: {
                    name: team2.team?.displayName || team2.team?.shortDisplayName || 'TBA',
                    score: team2.score || '',
                    overs: t2_oversFromScore || t2_overs,
                    isBatting: t2_isBatting
                },
                over_limit: event.competitions?.[0]?.overLimit || 20,
                winProbA: 0.5,
                winProbB: 0.5,
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
                    
                    // 1. Commentary from multiple sources
                    const commentary: any[] = [];
                    const rosters = summaryData.rosters || [];
                    
                    // 1-PRIORITY: Generate live situation commentary from current match state
                    // This ensures we ALWAYS have up-to-date commentary even when APIs fail
                    const situation = summaryData.situation;
                    if (situation) {
                        const currentOvers = situation.lastBattingTeam?.overs || matchObj.teamA.overs || '0';
                        
                        // Current partnership info
                        if (situation.batter1) {
                            const b1 = situation.batter1;
                            const b1Name = b1.athlete?.displayName || 'Batter 1';
                            commentary.push({
                                over: currentOvers,
                                ball: `🏏 ${b1Name}: ${b1.runs || 0}(${b1.balls || 0}) | SR: ${((b1.runs || 0) / (b1.balls || 1) * 100).toFixed(1)}`,
                                type: 'normal',
                                isPlay: true
                            });
                        }
                        if (situation.batter2) {
                            const b2 = situation.batter2;
                            const b2Name = b2.athlete?.displayName || 'Batter 2';
                            commentary.push({
                                over: currentOvers,
                                ball: `🏏 ${b2Name}: ${b2.runs || 0}(${b2.balls || 0}) | SR: ${((b2.runs || 0) / (b2.balls || 1) * 100).toFixed(1)}`,
                                type: 'normal',
                                isPlay: true
                            });
                        }
                        if (situation.bowler1) {
                            const bw = situation.bowler1;
                            const bwName = bw.athlete?.displayName || 'Bowler';
                            commentary.push({
                                over: currentOvers,
                                ball: `⚡ Bowling: ${bwName} ${bw.overs || 0}-${bw.maidens || 0}-${bw.conceded || 0}-${bw.wickets || 0}`,
                                type: 'normal',
                                isPlay: true
                            });
                        }
                        // Required rate
                        if (situation.lastBattingTeam?.remainingRuns) {
                            const remRuns = situation.lastBattingTeam.remainingRuns;
                            const remBalls = situation.lastBattingTeam.remainingBalls || 1;
                            const rrr = (remRuns / (remBalls / 6)).toFixed(2);
                            commentary.push({
                                over: currentOvers,
                                ball: `📊 Need ${remRuns} from ${remBalls} balls. Required Rate: ${rrr}`,
                                type: 'milestone',
                                isPlay: true
                            });
                        }
                        // Recent overs from situation
                        if (situation.recentOvers) {
                            const recentStr = situation.recentOvers.map((o: any) => `${o.over}: ${(o.runs || []).join(' ')}`).join(' | ');
                            if (recentStr) {
                                commentary.push({
                                    over: currentOvers,
                                    ball: `📋 Recent: ${recentStr}`,
                                    type: 'normal',
                                    isPlay: true
                                });
                            }
                        }
                    }

                    // 1a. Match Notes (milestones, strategic timeouts, reviews, powerplays)
                    const notes = summaryData.notes || [];
                    const matchNotes = notes.filter((n: any) => n.type === 'matchnote');
                    matchNotes.reverse().forEach((note: any) => {
                        const text = note.text || '';
                        let type = 'normal';
                        if (text.toLowerCase().includes('wicket') || text.toLowerCase().includes('review')) type = 'wicket';
                        else if (text.toLowerCase().includes('50 runs') || text.toLowerCase().includes('100 runs') || text.toLowerCase().includes('150 runs')) type = 'milestone';
                        else if (text.toLowerCase().includes('innings break')) type = 'innings_break';
                        else if (text.toLowerCase().includes('powerplay')) type = 'powerplay';
                        else if (text.toLowerCase().includes('strategic timeout')) type = 'timeout';

                        const overMatch = text.match(/(\d+\.?\d*)\s*ov/i);
                        commentary.push({
                            over: overMatch ? overMatch[1] : (note.section || ''),
                            ball: text,
                            type
                        });
                    });

                    // 1b. Roster dismissals (detailed wicket text)
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

                    // 1c. Ball-by-ball from hs-consumer-api (innings-aware)
                    try {
                        // Detect current innings from the summary data
                        const numInnings = summaryData.scorecards?.length || 1;
                        const commentaryV1Url = `https://hs-consumer-api.espncricinfo.com/v1/pages/match/commentary?lang=en&seriesId=${seriesId}&matchId=${event.id}&sortDirection=DESC&innings=${numInnings}`;
                        const commentaryV1Res = await axios.get(commentaryV1Url, { timeout: 5000 });
                        const comments = commentaryV1Res.data?.comments || [];
                        comments.slice(0, 20).forEach((c: any) => {
                            let type = 'normal';
                            const runs = c.runs || 0;
                            if (c.isWicket) type = 'wicket';
                            else if (c.isFour) type = 'four';
                            else if (c.isSix) type = 'six';
                            else if (runs === 0) type = 'dot';
                            else if (runs > 0) type = 'runs';
                            commentary.push({
                                over: String(c.overActual || c.overNumber || '0'),
                                ball: c.title || c.commentaryText?.substring(0, 150) || '',
                                type, runs,
                                isPlay: true
                            });
                        });
                    } catch {
                        // Consumer commentary API may be blocked — fallback to plays
                        const plays = summaryData.plays || {};
                        const playArray = Array.isArray(plays) ? plays : Object.values(plays);
                        (playArray as any[])
                            .sort((a: any, b: any) => (b.sequence || 0) - (a.sequence || 0))
                            .slice(0, 15)
                            .forEach((p: any) => {
                                let type = 'normal';
                                let scoreVal = p.scoreValue || 0;
                                if (p.dismissal) type = 'wicket';
                                else if (scoreVal === 6) type = 'six';
                                else if (scoreVal === 4) type = 'four';
                                else if (scoreVal === 0) type = 'dot';
                                else if (scoreVal > 0) type = 'runs';
                                commentary.push({
                                    over: p.over?.number !== undefined ? `${p.over.number}.${p.over.ball || 0}` : '0',
                                    ball: p.title || p.text || '',
                                    type, runs: scoreVal,
                                    isPlay: true
                                });
                            });
                    }

                    // 1d. Cricbuzz Scraper Fallback — if we still have < 5 ball-by-ball items
                    if (commentary.filter(c => c.isPlay).length < 5) {
                        try {
                            // Search Cricbuzz for the match
                            const t1Short = (team1.team?.shortDisplayName || team1.team?.abbreviation || '').toUpperCase();
                            const t2Short = (team2.team?.shortDisplayName || team2.team?.abbreviation || '').toUpperCase();
                            
                            // Cricbuzz IPL series ID for 2026 is 9241
                            const cbUrl = `https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/matches`;
                            const cbRes = await axios.get(cbUrl, {
                                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                                timeout: 4000
                            });
                            const cbHtml: string = cbRes.data;
                            
                            // Find match link containing both team abbreviations
                            const matchLinkRegex = new RegExp(`/live-cricket-scores/(\\d+)/[^"]*`, 'g');
                            const allLinks = [...cbHtml.matchAll(matchLinkRegex)];
                            
                            // Find the link that contains team names
                            const t1Name = (team1.team?.displayName || '').toLowerCase();
                            const t2Name = (team2.team?.displayName || '').toLowerCase();
                            
                            let cbMatchId = '';
                            for (const link of allLinks) {
                                const linkText = link[0].toLowerCase();
                                if ((linkText.includes(t1Short.toLowerCase()) && linkText.includes(t2Short.toLowerCase())) ||
                                    (linkText.includes('rcb') && linkText.includes('lsg')) ||
                                    (linkText.includes(t1Name.split(' ')[0]) || linkText.includes(t2Name.split(' ')[0]))) {
                                    cbMatchId = link[1];
                                    break;
                                }
                            }
                            
                            if (cbMatchId) {
                                // Fetch the live scores page which has SSR commentary
                                const scoreUrl = `https://www.cricbuzz.com/live-cricket-scores/${cbMatchId}`;
                                const scoreRes = await axios.get(scoreUrl, {
                                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                                    timeout: 4000
                                });
                                const scoreHtml: string = scoreRes.data;
                                
                                // Extract ball-by-ball from the OG description (contains latest balls)
                                const ogMatch = scoreHtml.match(/content="Follow.*?\|([^"]+)"/);
                                if (ogMatch) {
                                    const ogText = ogMatch[1].trim();
                                    // OG desc format: "RCB 86/3 (10.2) vs LSG 146 (Jitesh Sharma 0(1) Rajat Patidar 15(8))"
                                    commentary.push({
                                        over: ogText.match(/\((\d+\.\d+)\)/)?.[1] || '0',
                                        ball: `📡 ${ogText}`,
                                        type: 'normal',
                                        isPlay: true
                                    });
                                }
                                
                                // Extract recent balls timeline: "... 0 6 6 0 | 1 1 1 1 0 1 | W 0"
                                const recentMatch = scoreHtml.match(/Recent\s*:?\s*([^<]*(?:\d|W|\|)[^<]*)/i);
                                if (recentMatch) {
                                    const recentBalls = recentMatch[1].trim();
                                    commentary.push({
                                        over: 'Recent',
                                        ball: `🏏 Recent: ${recentBalls}`,
                                        type: recentBalls.includes('W') ? 'wicket' : 'normal',
                                        isPlay: true
                                    });
                                }
                                
                                // Extract commentary items from HTML — Cricbuzz uses cb-col items
                                const commRegex = /(\d+\.\d+)\s*<\/span>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;
                                const commMatches = [...scoreHtml.matchAll(commRegex)];
                                commMatches.slice(0, 15).forEach(m => {
                                    const overVal = m[1];
                                    let text = m[2].replace(/<[^>]*>/g, '').trim();
                                    if (text.length > 10) {
                                        let type = 'normal';
                                        if (text.toLowerCase().includes('out')) type = 'wicket';
                                        else if (text.includes('FOUR')) type = 'four';
                                        else if (text.includes('SIX')) type = 'six';
                                        else if (text.includes('no run')) type = 'dot';
                                        
                                        commentary.push({
                                            over: overVal,
                                            ball: text.substring(0, 200),
                                            type,
                                            isPlay: true
                                        });
                                    }
                                });
                            }
                        } catch { /* Cricbuzz scrape failed silently */ }
                    }

                    // Sort by over descending and deduplicate
                    // DEDUPLICATION & STABLE ID GENERATION
                    const seenBalls = new Set();
                    const finalCommentary: any[] = [];
                    const sortedByPriority = commentary.sort((a, b) => {
                         const priority = (item: any) => {
                             if (item.runs !== undefined) return 3;
                             if (item.ball.includes('OUT!')) return 2;
                             return 0;
                         };
                         return priority(b) - priority(a);
                    });

                    sortedByPriority.forEach(item => {
                        if (item.runs !== undefined) {
                            if (seenBalls.has(item.over)) return;
                            seenBalls.add(item.over);
                        }
                        const contentHash = Buffer.from(item.ball).toString('base64').substring(0, 8);
                        item.id = `${item.over}-${contentHash}`;
                        finalCommentary.push(item);
                    });

                    matchObj.live_commentary = finalCommentary
                        .sort((a: any, b: any) => parseFloat(b.over || '0') - parseFloat(a.over || '0'))
                        .slice(0, 15);

                    matchObj.last_balls = finalCommentary.filter((c: any) => c.runs !== undefined).slice(0, 6).map((c: any, idx: number) => ({
                        runs: c.type === 'four' ? 4 : (c.type === 'six' ? 6 : (c.runs || 0)),
                        outcome: c.type
                    }));

                    // 2. Active Batters from Rosters (situation.batter1/batter2 is often null)
                    const battingTeamId = t1_isBatting ? team1.team?.id : (t2_isBatting ? team2.team?.id : null);
                    const bowlingTeamId = t1_isBatting ? team2.team?.id : (t2_isBatting ? team1.team?.id : null);

                    // Find active batters from roster (batted=1, dismissal=0)
                    rosters.forEach((roster: any) => {
                        if (String(roster.team?.id) !== String(battingTeamId)) return;
                        (roster.roster || []).forEach((player: any) => {
                            const innerLs = player.linescores?.[0]?.linescores?.[0];
                            if (!innerLs) return;
                            const stats = innerLs.statistics?.categories?.[0]?.stats;
                            if (!stats) return;
                            const getStat = (name: string) => {
                                const s = stats.find((st: any) => st.name === name);
                                return s ? Number(s.value) : 0;
                            };
                            if (getStat('batted') === 1 && getStat('dismissal') === 0) {
                                matchObj.batters.push({
                                    name: player.athlete?.displayName || 'Unknown',
                                    runs: getStat('runs'),
                                    balls: getStat('ballsFaced'),
                                    fours: getStat('fours'),
                                    sixes: getStat('sixes'),
                                    strikeRate: getStat('strikeRate')
                                });
                            }
                        });
                    });
                    matchObj.batters = matchObj.batters.slice(0, 2);

                    // Find current bowlers from bowling team roster
                    rosters.forEach((roster: any) => {
                        if (String(roster.team?.id) !== String(bowlingTeamId)) return;
                        (roster.roster || []).forEach((player: any) => {
                            const innerLs = player.linescores?.[0]?.linescores?.[0];
                            if (!innerLs) return;
                            const stats = innerLs.statistics?.categories?.[0]?.stats;
                            if (!stats) return;
                            const getStat = (name: string) => {
                                const s = stats.find((st: any) => st.name === name);
                                return s ? Number(s.value) : 0;
                            };
                            const overs = getStat('overs');
                            if (overs > 0) {
                                matchObj.bowlers.push({
                                    name: player.athlete?.displayName || 'Unknown',
                                    overs,
                                    runs: getStat('conceded'),
                                    wickets: getStat('wickets'),
                                    economy: getStat('economyRate') || parseFloat((getStat('conceded') / overs).toFixed(2))
                                });
                            }
                        });
                    });
                    // Sort by most overs, keep the most active bowler
                    matchObj.bowlers.sort((a: any, b: any) => b.overs - a.overs);
                    if (matchObj.bowlers.length > 1) {
                        matchObj.bowlers = [matchObj.bowlers[0]];
                    }

                    // 3. CRR & Prediction — FIXED: use batting score and overs properly
                    const battingTeamComp = t1_isBatting ? team1 : (t2_isBatting ? team2 : team1);
                    const battingScoreStr = battingTeamComp.score || '0';
                    const battingRuns = parseInt(battingScoreStr.match(/^(\d+)/)?.[1] || '0') || 0;
                    const battingOversStr = t1_isBatting ? (t1_oversFromScore || t1_overs) : (t2_oversFromScore || t2_overs);
                    const parseOversToFloat = (ovStr: string) => {
                        if (!ovStr) return 0;
                        const p = ovStr.toString().split('.');
                        return ((parseInt(p[0]) || 0) * 6 + (parseInt(p[1] || '0') || 0)) / 6;
                    };
                    const oversFloat = parseOversToFloat(battingOversStr);
                    const crrValue = oversFloat > 0.1 ? battingRuns / oversFloat : 0;
                    const overLimit = matchObj.over_limit || 20;
                    const remainingOvers = Math.max(0, overLimit - oversFloat);
                    matchObj.crr = parseFloat(crrValue.toFixed(2));
                    matchObj.predictedScore = Math.max(battingRuns, battingRuns + Math.round(crrValue * remainingOvers));

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


