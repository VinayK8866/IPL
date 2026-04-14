import { NextResponse, NextRequest } from 'next/server';
import axios from 'axios';
import { generateLiveNarration } from '@/lib/gemini/narrator';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const ESPN_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Origin': 'https://www.espncricinfo.com',
    'Referer': 'https://www.espncricinfo.com/'
};

// In-memory cache for narration to save API credits
const narrationCache: Record<string, { text: string, ball: string }> = {};

/**
 * PROJECT CRICKET PULSE - MATCH DETAIL API (Robust v2)
 * 
 * Serverless-compatible API route for individual match details.
 * Replaces background workers on platforms like Vercel.
 */

const SERIES_IDS = ['1510719', '8048', '1527930', '1508731'];
const ESPN_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

function parseOvers(ovStr: string): number {
    if (!ovStr) return 0;
    const parts = ovStr.toString().split('.');
    const overs = parseInt(parts[0], 10) || 0;
    const balls = parts.length > 1 ? (parseInt(parts[1], 10) || 0) : 0;
    return (overs * 6 + balls) / 6;
}

export async function GET(
    request: NextRequest,
    context: any // Handle various Next.js versions
) {
    // Next.js 15/16 requires awaiting params if they are async
    const params = await context.params;
    const matchId = params.id;

    if (!matchId) {
        return NextResponse.json({ error: 'Match ID required' }, { status: 400 });
    }

    try {
        const parts = matchId.split('-');
        let seriesIdFromUrl: string | null = null;
        let eventId: string | null = null;

        if (parts.length >= 2) {
            seriesIdFromUrl = parts[0];
            eventId = parts.slice(1).join('-');
        } else {
            eventId = matchId;
        }

        // SEARCH STRATEGY: 
        // If we have both IDs, hit the target immediately for extreme speed.
        if (seriesIdFromUrl && eventId) {
            try {
                // Fetch Scoreboard (for base status) and Summary (for rich data) in parallel
                const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesIdFromUrl}/scoreboard?t=${Date.now()}`;
                const res = await axios.get(scoreboardUrl, { headers: ESPN_HEADERS, timeout: 5000 });
                const events = res.data.events || [];
                const foundEvent = events.find((e: any) => String(e.id) === String(eventId));

                if (foundEvent) {
                    const seriesName = res.data.leagues?.[0]?.name || 'Cricket';
                    const data = await buildEnrichedMatchScore(foundEvent, seriesIdFromUrl, eventId, seriesName);
                    return NextResponse.json(data);
                }
            } catch (err) {
                // Fallback to global search if targeted fetch fails
            }
        }

        const searchQueue = seriesIdFromUrl ? [seriesIdFromUrl, ...SERIES_IDS.filter(s => s !== seriesIdFromUrl)] : SERIES_IDS;

        for (const seriesId of searchQueue) {
            const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/scoreboard?t=${Date.now()}`;
            try {
                const res = await axios.get(scoreboardUrl, { headers: ESPN_HEADERS, timeout: 5000 });
                const events = res.data.events || [];
                
                const foundEvent = events.find((e: any) => 
                    String(e.id) === String(eventId) || 
                    String(e.id) === String(matchId) ||
                    `${seriesId}-${e.id}` === matchId
                );

                if (foundEvent) {
                    const seriesName = res.data.leagues?.[0]?.name || 'Cricket';
                    const data = await buildEnrichedMatchScore(foundEvent, seriesId, String(foundEvent.id), seriesName);
                    return NextResponse.json(data);
                }
            } catch (err) {
                continue;
            }
        }

        return NextResponse.json({
            error: 'Match not found',
            match_id: matchId,
            debug: { seriesIdFromUrl, eventId, searchQueue }
        }, { status: 404 });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function buildEnrichedMatchScore(event: any, seriesId: string, eventId: string, seriesName: string) {
    const competitors = event.competitions?.[0]?.competitors || [];
    const status = event.status || {};
    const state = status.type?.state || 'pre';
    const summaryText = status.summary || status.type?.shortDetail || 'Match in Progress';

    let mappedStatus: 'LIVE' | 'RESULT' | 'UPCOMING' = 'UPCOMING';
    if (state === 'in') mappedStatus = 'LIVE';
    else if (state === 'post') mappedStatus = 'RESULT';

    const team1 = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
    const team2 = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

    // Detect batting team more reliably
    const team1_ls = team1.linescores?.find((l: any) => l.isCurrent) || team1.linescores?.[team1.linescores?.length - 1];
    const team2_ls = team2.linescores?.find((l: any) => l.isCurrent) || team2.linescores?.[team2.linescores?.length - 1];
    
    const isBattingA = team1_ls?.isBatting || false;
    const isBattingB = team2_ls?.isBatting || false;

    // Build base score object
    const result: any = {
        match_id: `${seriesId}-${eventId}`,
        team_a: team1.team?.displayName || 'TBA',
        team_b: team2.team?.displayName || 'TBA',
        score: '0/0',
        overs: '0.0',
        over_limit: event.competitions?.[0]?.overLimit || 20, // Dynamic over limit
        crr: 0,
        win_prob_a: isBattingA ? 0.55 : 0.45,
        win_prob_b: isBattingB ? 0.55 : 0.45,
        status: mappedStatus,
        status_text: summaryText,
        is_second_innings: false,
        target: 0,
        predicted_score: 0,
        timestamp: new Date().toISOString(),

        series: seriesName,
        live_commentary: [],
        batters: [],
        bowlers: []
    };

    // Extract score and overs
    const battingTeam = isBattingA ? team1 : (isBattingB ? team2 : (team1.score ? team1 : team2));
    const battingLS = isBattingA ? team1_ls : (isBattingB ? team2_ls : (team1.score ? team1_ls : team2_ls));

    let scoreStr = battingTeam.score || '0/0';
    // Extract overs from score string like "162/6 (20/20 ov)" or "162/6 (19.3 ov)"
    let oversFromScore = '';
    const oversMatch = scoreStr.match(/\((\d+\.?\d*)(?:\/\d+)?\s*ov/);
    if (oversMatch) oversFromScore = oversMatch[1];
    
    if (scoreStr.includes('(')) scoreStr = scoreStr.split('(')[0].trim();
    result.score = scoreStr;
    // Use overs from score string first, then linescores.overs, never displayValue (it's 1)
    result.overs = oversFromScore || String(battingLS?.overs || '0.0');

    const oversFloat = parseOvers(result.overs);
    const scoreParts = result.score.split('/');
    const runsVal = parseInt(scoreParts[0]) || 0;
    const wicketsVal = parseInt(scoreParts[1]) || 0;
    
    result.crr = oversFloat > 0.1 ? parseFloat((runsVal / oversFloat).toFixed(2)) : 0;
    
    // PROJECTED SCORE: Use current score as floor. Project remaining overs based on CRR.
    const projectOverLimit = result.over_limit || 20;
    const remainingOvers = Math.max(0, projectOverLimit - oversFloat);
    const projectedRuns = runsVal + Math.round(result.crr * remainingOvers);
    
    result.predicted_score = Math.max(runsVal, projectedRuns);

    // Detect Second Innings and Target
    const t1_score = parseInt(team1.score?.split('/')?.[0]) || 0;
    const t2_score = parseInt(team2.score?.split('/')?.[0]) || 0;
    
    // Improved detection: if the designated non-batting team has a score recorded, 
    // and the batting team is different, it's a second innings.
    if (summaryText.toLowerCase().includes('need')) {
        const match = summaryText.match(/need\s+(\d+)\s+runs/i);
        if (match) {
            result.is_second_innings = true;
            const remainingRuns = parseInt(match[1]);
            result.target = runsVal + remainingRuns;
        }
    }

    if (!result.is_second_innings && t1_score > 0 && t2_score > 0) {
       result.is_second_innings = true;
       // Target is the completed first innings score + 1
       // If teamA is batting, teamB must have finished.
       result.target = (isBattingA ? t2_score : t1_score) + 1;
    }

    // Dynamic AI Prediction Heuristic (Simulated if official data missing)
    // Base 50/50, then adjust for CRR, wickets, and remaining runs
    let probA = 0.5;
    if (result.is_second_innings) {
        const target = result.target || 200;
        const remainingRuns = target - runsVal;
        const remainingOvers = (result.over_limit || 20) - oversFloat;
        const rrr = remainingOvers > 0 ? (remainingRuns / remainingOvers) : 12;
        
        // Simple second innings model
        probA = isBattingA ? (0.5 + (result.crr - rrr) * 0.05 - (wicketsVal * 0.04)) : (0.5 - (result.crr - rrr) * 0.05 + (wicketsVal * 0.04));
    } else {
        // Simple first innings model: advantage to batting team if CRR > 8, disadvantage if many wickets lost
        const modelCRR = 8.5;
        const crrDiff = result.crr - modelCRR;
        const wicketImpact = wicketsVal * 0.06;
        probA = isBattingA ? (0.55 + crrDiff * 0.03 - wicketImpact) : (0.45 - crrDiff * 0.03 + wicketImpact);
    }
    
    result.win_prob_a = Math.min(0.98, Math.max(0.02, probA));
    result.win_prob_b = 1 - result.win_prob_a;


    // Fetch Summary API for Commentary, Players, and Match Notes
    try {
        const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${eventId}&t=${Date.now()}`;
        const summaryRes = await axios.get(summaryUrl, { headers: ESPN_HEADERS, timeout: 5000 });
        const summaryData = summaryRes.data;

        // Update over_limit if available in summary
        if (summaryData.event?.competitions?.[0]?.overLimit) {
            result.over_limit = summaryData.event.competitions[0].overLimit;
        }

        // === 1. LIVE COMMENTARY from notes + roster dismissals + Telemetry Synthesis ===
        const commentary: any[] = [];

        // Telemetry Synthesis (Fresh pulse for every ball)
        const currentDetail = summaryData.header?.status?.summary || summaryText;
        if (currentDetail && !['Live', 'Live Detail'].includes(currentDetail)) {
             commentary.push({
                over: result.overs,
                ball: `⚡ ${currentDetail}`,
                type: 'status'
             });
        }

        // Add a 'Telemetry Update' if the match is live — ensures feed never feels 'stale'

        // 1a. Match Notes (powerplays, milestones, reviews, strategic timeouts, innings breaks)
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

            // Extract over from text like "Strategic Timeout: LSG - 65/4 in 8.5 overs"
            const overMatch = text.match(/(\d+\.?\d*)\s*ov/i);
            const overVal = overMatch ? overMatch[1] : (note.section || '');
            
            // Avoid duplicates from status updates
            if (overVal) {
                commentary.push({
                    over: overVal,
                    ball: text,
                    type,
                    isPlay: false
                });
            }
        });

        // 1b. Dismissal details from rosters (rich ball-by-ball text for each wicket)
        const rosters = summaryData.rosters || [];
        rosters.forEach((roster: any) => {
            (roster.roster || []).forEach((player: any) => {
                // Correct path: player.linescores[0].statistics.batting.outDetails
                const ls = player.linescores?.[0];
                const outDetails = ls?.statistics?.batting?.outDetails;
                
                if (outDetails?.details?.text) {
                    commentary.push({
                        over: String(outDetails.details.over?.overs || ''),
                        ball: `🏏 OUT! ${outDetails.details.shortText} — ${outDetails.details.text}`,
                        type: 'wicket',
                        isPlay: false
                    });
                }
            });
        });

        // 1c. Ball-by-ball plays (Unified High-Performance Consumer API + Fallback)
        try {
            const commentaryV1Url = `https://hs-consumer-api.espncricinfo.com/v1/pages/match/commentary?lang=en&seriesId=${seriesId}&matchId=${eventId}&sortDirection=DESC`;
            const commentaryV1Res = await axios.get(commentaryV1Url, { headers: ESPN_HEADERS, timeout: 5000 });
            const commentaryV1Data = commentaryV1Res.data;

            if (commentaryV1Data?.comments?.length > 0) {
                commentaryV1Data.comments.slice(0, 15).forEach((c: any) => {
                    let type = 'normal';
                    // Robust run extraction
                    let runs = (c.runs !== undefined) ? Number(c.runs) : (c.scoreValue !== undefined ? Number(c.scoreValue) : 0);
                    
                    // Fallback to title parsing if runs is 0 and it's not a wicket/dot
                    if (runs === 0 && c.title) {
                        const runMatch = c.title.match(/^(\d+)\s+run/i);
                        if (runMatch) runs = parseInt(runMatch[1]);
                    }

                    if (c.isWicket) type = 'wicket';
                    else if (c.isFour || (c.isBoundary && runs === 4)) type = 'four';
                    else if (c.isSix || (c.isBoundary && runs === 6)) type = 'six';
                    else if (runs === 0) type = 'dot';
                    else if (runs > 0) type = 'runs';

                    commentary.push({
                        over: String(c.overActual || c.overNumber || '0'),
                        ball: c.title || c.commentaryText?.substring(0, 100) || '',
                        type: type,
                        runs: runs,
                        isPlay: true
                    });
                });
            } else {
                // Secondary Fallback: Ball-by-ball plays (original site API)
                const plays = summaryData.plays || [];
                (plays || []).slice(0, 10).forEach((p: any) => {
                    let type = 'normal';
                    let scoreVal = (p.scoreValue !== undefined) ? Number(p.scoreValue) : (p.runs !== undefined ? Number(p.runs) : 0);
                    
                    // Fallback to title parsing
                    if (scoreVal === 0 && p.title) {
                        const runMatch = p.title.match(/^(\d+)\s+run/i);
                        if (runMatch) scoreVal = parseInt(runMatch[1]);
                    }

                    if (p.dismissal) type = 'wicket';
                    else if (p.isBoundary && scoreVal === 6) type = 'six';
                    else if (p.isBoundary && scoreVal === 4) type = 'four';
                    else if (scoreVal === 6) type = 'six';
                    else if (scoreVal === 4) type = 'four';
                    else if (scoreVal === 0) type = 'dot';
                    else if (scoreVal > 0) type = 'runs';

                    commentary.push({
                        over: p.over?.number || '0',
                        ball: `${p.over?.ball || '0'}: ${p.title || p.text || ''}`,
                        type: type,
                        runs: scoreVal,
                        isPlay: true
                    });
                });
            }
        } catch (err) {
             console.warn('[API] Recovery fallback: Consumer commentary failed');
        }

        // === DEDUPLICATION & STABLE ID GENERATION ===
        const seenBalls = new Set();
        const finalCommentary: any[] = [];
        
        // Priority: Plays (detailed) > Roster Dismissals > Match Notes > Telemetry
        const sortedByPriority = commentary.sort((a, b) => {
             const priority = (item: any) => {
                 if (item.isPlay) return 3;
                 if (item.ball.includes('OUT!')) return 2;
                 if (item.type === 'milestone') return 1;
                 return 0;
             };
             return priority(b) - priority(a);
        });

        sortedByPriority.forEach(item => {
            const ballKey = `${item.over}-${item.isPlay ? 'play' : 'note'}`;
            // For plays, we only want one entry per specific ball (e.g. 15.4)
            if (item.isPlay) {
                if (seenBalls.has(item.over)) return;
                seenBalls.add(item.over);
            }
            
            // Generate a stable ID based on content to prevent UI flicker
            const contentHash = Buffer.from(item.ball).toString('base64').substring(0, 8);
            item.id = `${item.over}-${contentHash}`;
            finalCommentary.push(item);
        });

        // Re-sort by over descending for display
        finalCommentary.sort((a: any, b: any) => {
            const ovA = parseFloat(a.over) || 0;
            const ovB = parseFloat(b.over) || 0;
            return ovB - ovA;
        });

        // === AI LIVE NARRATION with Persistent Cooldown ===
        if (mappedStatus === 'LIVE') {
            const lastBall = result.overs;
            const cacheKey = result.match_id;
            const now = Date.now();
            
            // 60-second cooldown per match to prevent Gemini rate-limiting and response lag
            const lastNarrationTime = (global as any)._narrationTimestamps?.[cacheKey] || 0;
            const hasCooldown = (now - lastNarrationTime) < 60000;

            if (!narrationCache[cacheKey] || (narrationCache[cacheKey].ball !== lastBall && !hasCooldown)) {
                try {
                    const recentSlice = finalCommentary.slice(0, 5);
                    const aiNarrative = await generateLiveNarration(result, recentSlice);
                    narrationCache[cacheKey] = { text: aiNarrative, ball: lastBall };
                    
                    // Update global state tracking
                    if (!(global as any)._narrationTimestamps) (global as any)._narrationTimestamps = {};
                    (global as any)._narrationTimestamps[cacheKey] = now;
                } catch (e) {
                    console.warn('[AI] Narration step failed');
                }
            }

            if (narrationCache[cacheKey]) {
                finalCommentary.unshift({
                    id: `ai-pulse-${result.match_id}-${lastBall}`,
                    over: narrationCache[cacheKey].ball,
                    ball: `🤖 ${narrationCache[cacheKey].text}`,
                    type: 'normal'
                });
            }
        }

        result.live_commentary = finalCommentary.slice(0, 20);

        // SYNC TO SUPABASE (Persistence allows dashboard and workers to share state)
        if (supabase) {
            try {
                await supabase.from('matches').upsert({
                    id: result.match_id,
                    team_a: result.team_a,
                    team_b: result.team_b,
                    score: result.score,
                    overs: result.overs,
                    status: result.status.toLowerCase(),
                    live_commentary: result.live_commentary,
                    win_prob_a: result.win_prob_a,
                    win_prob_b: result.win_prob_b,
                    current_momentum_json: { history: [result.win_prob_a], last_ball: result.overs }
                });
            } catch (e) {
                console.warn('[Supabase] Sync failed in API route');
            }
        }

        // === 1d. POPULATE LAST BALLS TRACKER for Gladiator HUD ===
        // STRATEGY: Only use verified ball-by-ball plays (isPlay: true). 
        // DO NOT fallback to match notes, as they are editorial highlights (mostly wickets) 
        // that pollute the rolling timeline with redundant 'W' icons.
        const verifiedPlays = commentary.filter((c: any) => c.isPlay === true);
        
        // Final sanity check: if even verified plays is empty (rare), 
        // only then try a very strict regex on the full commentary.
        let finalBallSource = verifiedPlays;
        if (finalBallSource.length === 0) {
            finalBallSource = commentary.filter((c: any) => 
               c.over && c.ball && /^\d+\.\d+/.test(c.over) && // Must be a specific ball number like 12.4
               !c.ball.includes('Strategic Timeout') &&
               !c.ball.includes('Powerplay')
            );
        }

        result.last_balls = finalBallSource.slice(0, 12).map((c: any) => {
            const isWicket = c.type === 'wicket' || (c.ball && c.ball.toLowerCase().includes('out!'));
            let val = '0';
            if (isWicket) val = 'W';
            else if (c.type === 'four' || (c.ball && c.ball.toLowerCase().includes('four'))) val = '4';
            else if (c.type === 'six' || (c.ball && c.ball.toLowerCase().includes('six'))) val = '6';
            else if (c.type === 'runs' || (c.runs && c.runs > 0)) val = String(c.runs !== undefined ? c.runs : '1');
            else if (c.type === 'dot') val = '0';
            else val = String(c.runs !== undefined ? c.runs : '0');

            return {
                value: val,
                is_wicket: isWicket,
                timestamp: new Date().toISOString(),
                over: c.over
            };
        }).reverse();

        // === 2. PLAYER STATS: Try situation first, fall back to rosters ===
        const situ = summaryData.situation;
        const battingTeamIdForRoster = isBattingA ? team1.team?.id : (isBattingB ? team2.team?.id : null);
        const bowlingTeamIdForRoster = isBattingA ? team2.team?.id : (isBattingB ? team1.team?.id : null);

        // Try situation data first
        if (situ?.batter1) {
            result.batters.push({
                name: situ.batter1.athlete?.displayName || 'Batter 1',
                runs: situ.batter1.runs || 0,
                balls: situ.batter1.balls || 0,
                fours: 0, sixes: 0,
                strikeRate: (situ.batter1.runs / Math.max(1, situ.batter1.balls || 0)) * 100,
                isBatting: true
            });
        }
        if (situ?.batter2) {
            result.batters.push({
                name: situ.batter2.athlete?.displayName || 'Batter 2',
                runs: situ.batter2.runs || 0,
                balls: situ.batter2.balls || 0,
                fours: 0, sixes: 0,
                strikeRate: (situ.batter2.runs / Math.max(1, situ.batter2.balls || 0)) * 100,
                isBatting: false
            });
        }

        // Fallback: Ultra-Aggressive search in ALL rosters for anyone with batted=1 and no outDetails
        if (result.batters.length === 0) {
            rosters.forEach((roster: any) => {
                (roster.roster || []).forEach((p: any) => {
                    const stats = p.linescores?.[0]?.linescores?.[0]?.statistics || p.linescores?.[0]?.statistics;
                    if (!stats || !stats.batting) return;
                    
                    const bat = stats.batting;
                    const runs = Number(bat.runs || 0);
                    const balls = Number(bat.ballsFaced || 0);
                    const sr = Number(bat.strikeRate || 0);
                    
                    // If they have batted and are not out
                    if (!bat.outDetails && (runs > 0 || balls > 0)) {
                        result.batters.push({
                            name: p.athlete?.displayName || 'Unknown',
                            runs,
                            balls,
                            fours: Number(bat.fours || 0),
                            sixes: Number(bat.sixes || 0),
                            strikeRate: sr > 0 ? sr : (runs / Math.max(1, balls)) * 100,
                            isBatting: result.batters.length === 0
                        });
                    }
                });
            });
        }
        result.batters = result.batters.slice(0, 2);

        // Bowler: Try situation first
        if (situ?.bowler1) {
            const overs = situ.bowler1.overs || 0;
            result.bowlers.push({
                name: situ.bowler1.athlete?.displayName || 'Bowler',
                overs,
                runs: situ.bowler1.conceded || 0,
                wickets: situ.bowler1.wickets || 0,
                economy: overs > 0 ? parseFloat(((situ.bowler1.conceded || 0) / overs).toFixed(2)) : 0
            });
        }

        // Fallback: Extract bowlers from bowling team roster
        if (result.bowlers.length === 0) {
            rosters.forEach((roster: any) => {
                (roster.roster || []).forEach((player: any) => {
                    const innerLs = player.linescores?.[0]?.linescores?.[0] || player.linescores?.[0];
                    if (!innerLs) return;
                    const stats = innerLs.statistics?.categories?.[0]?.stats || innerLs.statistics?.bowling?.stats;
                    if (!stats) return;
                    
                    const getStatVal = (name: string) => {
                        const s = stats.find ? stats.find((st: any) => st.name === name) : null;
                        return s ? Number(s.value) : 0;
                    };
                    
                    const overs = getStatVal('overs') || Number(innerLs.statistics?.bowling?.overs || 0);
                    if (overs > 0) {
                        result.bowlers.push({
                            name: player.athlete?.displayName || 'Unknown',
                            overs,
                            runs: getStatVal('conceded') || Number(innerLs.statistics?.bowling?.conceded || 0),
                            wickets: getStatVal('wickets') || Number(innerLs.statistics?.bowling?.wickets || 0),
                            economy: getStatVal('economyRate') || parseFloat((getStatVal('conceded') / (overs || 1)).toFixed(2))
                        });
                    }
                });
            });
            // Keep most active bowler (highest overs)
            result.bowlers.sort((a: any, b: any) => (parseFloat(b.overs) || 0) - (parseFloat(a.overs) || 0));
            if (result.bowlers.length > 1) {
                result.bowlers = [result.bowlers[0]];
            }
        }

        // === 3. Win Probability from Odds ===
        const odds = summaryData.odds?.[0];
        if (odds?.homeTeamOdds && odds?.awayTeamOdds) {
            // Parse fractional odds to implied probability
            const parseOdds = (summary: string) => {
                const parts = summary.split('/');
                if (parts.length === 2) {
                    const num = parseFloat(parts[0]);
                    const den = parseFloat(parts[1]);
                    return den / (num + den);
                }
                return 0.5;
            };
            result.win_prob_a = parseOdds(odds.homeTeamOdds.odds?.summary || '1/1');
            result.win_prob_b = parseOdds(odds.awayTeamOdds.odds?.summary || '1/1');
        }

        if (summaryData.predictor?.homeTeam) {
            result.win_prob_a = (summaryData.predictor.homeTeam.gameProjection || 50) / 100;
            result.win_prob_b = 1 - result.win_prob_a;
        }
    } catch {
        // Summary fetch failure is non-fatal — scoreboard data still drives the score
    }

    return result;
}
