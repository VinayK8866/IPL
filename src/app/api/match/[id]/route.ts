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
    if (scoreStr.includes('(')) scoreStr = scoreStr.split('(')[0].trim();
    result.score = scoreStr;
    result.overs = String(battingLS?.overs || battingLS?.displayValue || '0.0');

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

        // === 1. LIVE COMMENTARY from notes + roster dismissals ===
        const commentary: any[] = [];

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
            commentary.push({
                over: overMatch ? overMatch[1] : (note.section || ''),
                ball: text,
                type
            });
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
                        type: 'wicket'
                    });
                }
            });
        });

        // 1c. Ball-by-ball plays (if available)
        const plays = summaryData.plays || [];
        (plays || []).slice(0, 10).forEach((p: any) => {
            let type = 'normal';
            let scoreVal = p.scoreValue || 0;
            if (p.dismissal) type = 'wicket';
            else if (scoreVal === 6) type = 'six';
            else if (scoreVal === 4) type = 'four';
            else if (scoreVal === 0) type = 'dot';
            else if (scoreVal > 0) type = 'runs';

            commentary.push({
                over: p.over?.number || '0',
                ball: `${p.over?.ball || '0'}: ${p.title || p.text || ''}`,
                type: type,
                runs: scoreVal
            });
        });

        // Sort: most recent events first (higher over number = more recent)
        commentary.sort((a: any, b: any) => {
            const ovA = parseFloat(a.over) || 0;
            const ovB = parseFloat(b.over) || 0;
            return ovB - ovA;
        });

        // Add the current match status as the top commentary line
        commentary.unshift({
            over: result.overs,
            ball: `📡 ${summaryText}`,
            type: 'status'
        });

        result.live_commentary = commentary.slice(0, 20);

        // === 2. PLAYER STATS from rosters (since situation is empty) ===
        // Find the currently batting team's roster
        const battingRosterId = isBattingA ? team1.team?.id : (isBattingB ? team2.team?.id : null);
        const bowlingRosterId = isBattingA ? team2.team?.id : (isBattingB ? team1.team?.id : null);

        // Determine which innings section to look at
        const currentInningsSection = result.is_second_innings ? 1 : 0; // 0-indexed in rosters array

        rosters.forEach((roster: any) => {
            const teamId = roster.team?.id;
            const isBattingRoster = String(teamId) === String(battingRosterId);
            const isBowlingRoster = String(teamId) === String(bowlingRosterId);

            (roster.roster || []).forEach((player: any) => {
                const ls = player.linescores?.[0]?.linescores?.[0];
                if (!ls) return;
                const stats = ls.statistics?.categories?.[0]?.stats;
                if (!stats) return;
                const getStat = (name: string) => {
                    const s = stats.find((s: any) => s.name === name);
                    return s ? Number(s.value) : 0;
                };

                // Extract active batters (who batted and were NOT dismissed)
                if (isBattingRoster && getStat('batted') === 1 && getStat('dismissal') === 0) {
                    result.batters.push({
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

        // Limit to 2 batters (the current crease pair)
        result.batters = result.batters.slice(0, 2);

        // Extract bowlers from the bowling team's roster (look at bowling stats)
        rosters.forEach((roster: any) => {
            const teamId = roster.team?.id;
            if (String(teamId) !== String(bowlingRosterId)) return;

            (roster.roster || []).forEach((player: any) => {
                // Bowlers have linescores in the batting team's innings period
                const bowlLs = player.linescores?.[0]?.linescores;
                if (!bowlLs) return;
                bowlLs.forEach((ls: any) => {
                    const bowlStats = ls.statistics?.categories?.[0]?.stats;
                    if (!bowlStats) return;
                    const getBowlStat = (name: string) => {
                        const s = bowlStats.find((s: any) => s.name === name);
                        return s ? Number(s.value) : 0;
                    };
                    const overs = getBowlStat('overs');
                    if (overs > 0) {
                        result.bowlers.push({
                            name: player.athlete?.displayName || 'Unknown',
                            overs: overs,
                            runs: getBowlStat('conceded'),
                            wickets: getBowlStat('wickets'),
                            economy: getBowlStat('economy')
                        });
                    }
                });
            });
        });

        // Sort bowlers by most recent (highest overs), then take the current one
        result.bowlers.sort((a: any, b: any) => b.overs - a.overs);
        if (result.bowlers.length > 1) {
            result.bowlers = [result.bowlers[0]]; // Show only the most active bowler
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
