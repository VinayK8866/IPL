import { NextResponse, NextRequest } from 'next/server';
import axios from 'axios';

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

        // Search strategy:
        // 1. Try the series ID provided in the URL first
        // 2. Fallback to searching all other known SERIES_IDS
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
    if (scoreStr.includes('(')) scoreStr = scoreStr.split('(')[0].trim();
    result.score = scoreStr;
    result.overs = String(battingLS?.overs || battingLS?.displayValue || '0.0');

    const oversFloat = parseOvers(result.overs);
    const runsVal = parseInt(result.score.split('/')[0]) || 0;
    result.crr = oversFloat > 0.1 ? parseFloat((runsVal / oversFloat).toFixed(2)) : 0;
    result.predicted_score = Math.round(result.crr * 20);

    // Detect Second Innings and Target from summaryText
    // Common formats: "Team Need 123 runs from 60 balls", "Team Need 123 runs"
    if (summaryText.toLowerCase().includes('need')) {
        const match = summaryText.match(/need\s+(\d+)\s+runs/i);
        if (match) {
            result.is_second_innings = true;
            const remainingRuns = parseInt(match[1]);
            result.target = runsVal + remainingRuns;
        }
    }

    // Fallback detection: If batting team score < target score of first team
    const t1_score = parseInt(team1.score?.split('/')?.[0]) || 0;
    const t2_score = parseInt(team2.score?.split('/')?.[0]) || 0;
    if (!result.is_second_innings && t1_score > 0 && t2_score > 0) {
       result.is_second_innings = true;
       result.target = Math.max(t1_score, t2_score) + 1;
    }


        // Fetch Summary API for Commentary and Batters
        try {
            const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${eventId}&t=${Date.now()}`;
            const summaryRes = await axios.get(summaryUrl, { headers: ESPN_HEADERS, timeout: 5000 });
            const summaryData = summaryRes.data;

            // 1. Commentary & NLP-derived coordinates
            if (summaryData.plays && (Array.isArray(summaryData.plays) || Object.keys(summaryData.plays).length > 0)) {
                const plays = Array.isArray(summaryData.plays) ? summaryData.plays : Object.values(summaryData.plays);
                const sortedPlays = plays.sort((a: any, b: any) => (b.sequence || 0) - (a.sequence || 0));
                
                result.live_commentary = sortedPlays.slice(0, 15).map((p: any) => ({
                    over: String(p.over?.number || p.period || '0'),
                    ball: `${p.over?.ball || ''}: ${p.title || p.text || ''}`.trim(),
                    type: p.dismissal?.dismissal ? 'wicket' : (p.scoreValue === 6 ? 'six' : (p.scoreValue === 4 ? 'four' : 'normal'))
                }));

                result.last_balls = sortedPlays.slice(0, 6).map((p: any, idx: number) => {
                    const text = (p.text || '').toLowerCase();
                    let x = 0.5, y = 0.6, angle = 0;
                    
                    if (text.includes('outside off') || text.includes('width')) x = 0.8;
                    else if (text.includes('leg stump') || text.includes('pads')) x = 0.2;
                    
                    if (text.includes('short') || text.includes('bounced')) y = 0.3;
                    else if (text.includes('full') || text.includes('half volley')) y = 0.8;
                    else if (text.includes('yorker')) y = 1.0;
                    
                    if (text.includes('cover') || text.includes('point')) angle = 135;
                    else if (text.includes('mid-off') || text.includes('long-off')) angle = 180;
                    else if (text.includes('mid-on') || text.includes('long-on')) angle = 0;
                    else if (text.includes('mid-wicket') || text.includes('square leg')) angle = 45;
                    
                    return {
                        x, y, z: angle,
                        type: p.scoreValue >= 4 ? 'pace' : 'spin',
                        is_wicket: !!p.dismissal?.dismissal,
                        timestamp: new Date(Date.now() - idx * 60000).toISOString()
                    };
                });
            } else {
                // FALLBACK: Use status summary as a single commentary line if plays is empty
                result.live_commentary = [{
                    over: result.overs.split('.')[0],
                    ball: `SYNC: ${summaryText}`,
                    type: 'normal'
                }];
            }


        // 2. Situational Players (Batters/Bowlers)
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
            result.batters = [b1, b2].filter(Boolean);
            
            if (situ.bowler1) {
                result.bowlers = [{
                    name: situ.bowler1.athlete?.displayName || 'Bowler',
                    overs: situ.bowler1.overs || 0,
                    runs: situ.bowler1.conceded || 0,
                    wickets: situ.bowler1.wickets || 0
                }];
            }
        }

        // 3. Win Probability
        if (summaryData.predictor?.homeTeam) {
            result.win_prob_a = (summaryData.predictor.homeTeam.gameProjection || 50) / 100;
            result.win_prob_b = 1 - result.win_prob_a;
        }
    } catch {
        // Summary fetch failure is non-fatal
    }

    return result;
}
