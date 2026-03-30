import { NextResponse, NextRequest } from 'next/server';
import axios from 'axios';

/**
 * PROJECT CRICKET PULSE - MATCH DETAIL API
 * 
 * Serverless-compatible API route that fetches detailed match data
 * directly from ESPN for a specific match ID.
 * This replaces the need for the background data_scraper.js worker
 * on platforms like Vercel that don't support persistent processes.
 * 
 * Match ID format from homepage: "{seriesId}-{eventId}" e.g. "1527930-1527949"
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

interface Commentary {
    over: string;
    ball: string;
    type: string;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params;

    if (!matchId) {
        return NextResponse.json({ error: 'Match ID required' }, { status: 400 });
    }

    try {
        // Parse composite ID: "seriesId-eventId"
        const parts = matchId.split('-');
        let seriesId: string | null = null;
        let eventId: string | null = null;

        if (parts.length >= 2) {
            // Check if first part is a known series ID
            const possibleSeriesId = parts[0];
            if (SERIES_IDS.includes(possibleSeriesId)) {
                seriesId = possibleSeriesId;
                eventId = parts.slice(1).join('-');
            } else {
                // Try all series to find this match
                eventId = matchId;
            }
        } else {
            eventId = matchId;
        }

        // Strategy 1: If we know the series, fetch directly
        if (seriesId && eventId) {
            const result = await fetchMatchDetail(seriesId, eventId);
            if (result) {
                return NextResponse.json(result);
            }
        }

        // Strategy 2: Search across all series scoreboards to find the match
        const searchResults = await searchMatchAcrossSeries(matchId);
        if (searchResults) {
            return NextResponse.json(searchResults);
        }

        return NextResponse.json({
            error: 'Match not found',
            match_id: matchId,
            score: null
        }, { status: 404 });

    } catch (err: any) {
        console.error(`[Match API] Error for ${matchId}:`, err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function fetchMatchDetail(seriesId: string, eventId: string) {
    try {
        // Fetch scoreboard for the series
        const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/scoreboard?t=${Date.now()}`;
        const scoreboardRes = await axios.get(scoreboardUrl, {
            headers: ESPN_HEADERS,
            timeout: 8000
        });

        const events = scoreboardRes.data.events || [];
        const event = events.find((e: any) => String(e.id) === String(eventId));

        if (!event) return null;

        const seriesName = scoreboardRes.data.leagues?.[0]?.name || 'Cricket';
        const matchScore = buildMatchScore(event, seriesId, eventId, seriesName);

        // Also try to fetch commentary/plays
        let commentary: Commentary[] = [];
        try {
            const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${eventId}&t=${Date.now()}`;
            const summaryRes = await axios.get(summaryUrl, {
                headers: ESPN_HEADERS,
                timeout: 8000
            });

            const plays = summaryRes.data.plays;
            if (plays) {
                // plays can be an object or array depending on ESPN revision
                const playArray = Array.isArray(plays) ? plays : Object.values(plays);
                commentary = playArray
                    .sort((a: any, b: any) => (b.sequence || 0) - (a.sequence || 0))
                    .slice(0, 15)
                    .map((p: any) => ({
                        over: String(p.over?.number || p.period || '0'),
                        ball: `${p.over?.ball || ''}: ${p.title || p.text || p.shortText || ''}`.trim(),
                        type: p.dismissal?.dismissal ? 'wicket' :
                            p.scoreValue === 6 ? 'six' :
                                p.scoreValue === 4 ? 'four' : 'normal'
                    }));
            }
        } catch {
            // Commentary is optional, don't fail the whole request
        }

        return {
            ...matchScore,
            live_commentary: commentary
        };

    } catch (err: any) {
        console.error(`[Match API] Direct fetch failed for ${seriesId}/${eventId}:`, err.message);
        return null;
    }
}

async function searchMatchAcrossSeries(compositeId: string) {
    // Try each series scoreboard to find the match
    for (const seriesId of SERIES_IDS) {
        try {
            const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/scoreboard?t=${Date.now()}`;
            const res = await axios.get(url, {
                headers: ESPN_HEADERS,
                timeout: 8000
            });

            const events = res.data.events || [];
            const seriesName = res.data.leagues?.[0]?.name || 'Cricket';

            for (const event of events) {
                const checkId = `${seriesId}-${event.id}`;
                if (checkId === compositeId || String(event.id) === compositeId) {
                    const matchScore = buildMatchScore(event, seriesId, event.id, seriesName);

                    // Also try to get commentary
                    let commentary: Commentary[] = [];
                    try {
                        const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${event.id}&t=${Date.now()}`;
                        const summaryRes = await axios.get(summaryUrl, {
                            headers: ESPN_HEADERS,
                            timeout: 8000
                        });

                        const plays = summaryRes.data.plays;
                        if (plays) {
                            const playArray = Array.isArray(plays) ? plays : Object.values(plays);
                            commentary = playArray
                                .sort((a: any, b: any) => (b.sequence || 0) - (a.sequence || 0))
                                .slice(0, 15)
                                .map((p: any) => ({
                                    over: String(p.over?.number || p.period || '0'),
                                    ball: `${p.over?.ball || ''}: ${p.title || p.text || p.shortText || ''}`.trim(),
                                    type: p.dismissal?.dismissal ? 'wicket' :
                                        p.scoreValue === 6 ? 'six' :
                                            p.scoreValue === 4 ? 'four' : 'normal'
                                }));
                        }
                    } catch {
                        // Commentary is optional
                    }

                    return {
                        ...matchScore,
                        live_commentary: commentary
                    };
                }
            }
        } catch {
            continue;
        }
    }

    return null;
}

function buildMatchScore(event: any, seriesId: string, eventId: string, seriesName: string) {
    const competitors = event.competitions?.[0]?.competitors || [];
    const status = event.status || {};
    const state = status.type?.state || 'pre';
    const summary = status.summary || status.type?.shortDetail || status.type?.description || '';

    let mappedStatus: 'LIVE' | 'RESULT' | 'UPCOMING' = 'UPCOMING';
    if (state === 'in') mappedStatus = 'LIVE';
    else if (state === 'post') mappedStatus = 'RESULT';

    const team1 = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
    const team2 = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

    if (!team1 || !team2) {
        return {
            match_id: `${seriesId}-${eventId}`,
            team_a: 'TBA',
            team_b: 'TBA',
            score: '0/0',
            overs: '0.0',
            crr: 0,
            win_prob_a: 0.5,
            win_prob_b: 0.5,
            batters: [],
            bowlers: [],
            last_balls: [],
            status: mappedStatus,
            status_text: summary,
            predicted_score: 0,
            timestamp: new Date().toISOString(),
            series: seriesName
        };
    }

    const teamA_name = team1.team?.displayName || team1.team?.shortDisplayName || 'TBA';
    const teamB_name = team2.team?.displayName || team2.team?.shortDisplayName || 'TBA';
    const teamA_score = team1.score || '';
    const teamB_score = team2.score || '';
    const teamA_overs = team1.linescores?.[0]?.displayValue || '';
    const teamB_overs = team2.linescores?.[0]?.displayValue || '';

    // Determine batting team's score and overs  
    const isBattingTeamA = team1.curatedRank?.toString() === '1';
    const battingScore = isBattingTeamA ? teamA_score : teamB_score;
    const battingOvers = isBattingTeamA ? teamA_overs : teamB_overs;
    const displayScore = battingScore || teamA_score || teamB_score || '0/0';
    const displayOvers = battingOvers || teamA_overs || teamB_overs || '0.0';

    // Calculate CRR
    const oversFloat = parseOvers(displayOvers);
    const runsVal = parseInt(displayScore.split('/')[0]) || 0;
    let crr = oversFloat > 0.05 ? runsVal / oversFloat : 0;
    if (crr > 36) crr = 36;
    const predictedScore = Math.round(crr * 20);

    // Build batters from linescores if available
    const batters: any[] = [];
    // ESPN doesn't always give per-batter stats in scoreboard, but we can try
    const battingTeam = isBattingTeamA ? team1 : team2;
    if (battingTeam.leaders) {
        for (const leader of battingTeam.leaders) {
            if (leader.name === 'batting' && leader.leaders) {
                for (const batter of leader.leaders) {
                    batters.push({
                        name: batter.athlete?.shortName || batter.athlete?.displayName || 'Unknown',
                        runs: batter.value || 0,
                        balls: 0,
                        fours: 0,
                        sixes: 0,
                        strikeRate: 0
                    });
                }
            }
        }
    }

    return {
        match_id: `${seriesId}-${eventId}`,
        team_a: teamA_name,
        team_b: teamB_name,
        score: displayScore,
        overs: displayOvers,
        crr: parseFloat(crr.toFixed(2)),
        win_prob_a: isBattingTeamA ? 0.6 : 0.4,
        win_prob_b: isBattingTeamA ? 0.4 : 0.6,
        batters: batters,
        bowlers: [],
        last_balls: [],
        status: mappedStatus,
        status_text: summary,
        predicted_score: predictedScore,
        timestamp: new Date().toISOString(),
        series: seriesName,
        teamA: {
            name: teamA_name,
            score: teamA_score,
            overs: teamA_overs,
            isBatting: isBattingTeamA
        },
        teamB: {
            name: teamB_name,
            score: teamB_score,
            overs: teamB_overs,
            isBatting: !isBattingTeamA
        }
    };
}
