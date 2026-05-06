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

        // FALLBACK: Try fetching from scraped_scores (Chrome Extension)
        try {
            const { data: scrapedScores } = await supabase
                .from('scraped_scores')
                .select('*');

            if (scrapedScores && scrapedScores.length > 0) {
                // Fuzzy match by team name
                // Note: matchId might be something like '1510719-1426245'
                // We'll look for a scraped score that has similar team names to what we expect 
                // OR we can try to find the match in the 'matches' table first to get team names.
                const { data: matchMeta } = await supabase
                    .from('matches')
                    .select('team_a, team_b')
                    .eq('id', matchId)
                    .single();

                if (matchMeta) {
                    const matchingScraped = scrapedScores.find(s => {
                        const apiTeams = [matchMeta.team_a.toLowerCase(), matchMeta.team_b.toLowerCase()];
                        const scrapedTeams = [s.team1_name.toLowerCase(), s.team2_name.toLowerCase()];
                        return apiTeams.every(t => scrapedTeams.some(st => st.includes(t) || t.includes(st)));
                    });

                    if (matchingScraped) {
                        return NextResponse.json({
                            id: matchId,
                            team_a: matchMeta.team_a,
                            team_b: matchMeta.team_b,
                            score: matchingScraped.team1_score !== 'N/A' ? matchingScraped.team1_score : (matchingScraped.team2_score !== 'N/A' ? matchingScraped.team2_score : '0/0'),
                            overs: matchingScraped.match_status.match(/(\d+\.?\d*)\s*ov/)?.[1] || '0.0',
                            status_text: matchingScraped.match_status,
                            win_prob_a: 0.5,
                            win_prob_b: 0.5,
                            isScraped: true,
                            scorecard_json: matchingScraped.scorecard_json || [],
                            commentary_json: matchingScraped.commentary_json || [],
                            timestamp: matchingScraped.scraped_at
                        });
                    }
                }
            }
        } catch (err) {
            console.warn('[API] Scraped fallback failed');
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
    const commentary: any[] = [];
    let summaryData: any = null;

    try {
        const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${eventId}&t=${Date.now()}`;
        const summaryRes = await axios.get(summaryUrl, { headers: ESPN_HEADERS, timeout: 5000 });
        summaryData = summaryRes.data;

        // Update over_limit if available in summary
        if (summaryData?.event?.competitions?.[0]?.overLimit) {
            result.over_limit = summaryData.event.competitions[0].overLimit;
        }
    } catch (err) {
        console.warn('[API] ESPN Summary fetch failed, proceeding with fallbacks');
    }

    // === 1. LIVE COMMENTARY SYNTHESIS ===
    
    // Telemetry Synthesis (Fresh pulse for every ball)
    const currentDetail = summaryData?.header?.status?.summary || summaryText;
    if (currentDetail && !['Live', 'Live Detail'].includes(currentDetail)) {
            commentary.push({
            over: result.overs,
            ball: `⚡ ${currentDetail}`,
            type: 'status',
            isPlay: false
            });
    }
    if (summaryData) {
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
            // DETECT CURRENT INNINGS
            const currentInnings = summaryData.match?.status === 'live' ? (summaryData.match?.currentInnings || 1) : 1;
            const commentaryV1Url = `https://hs-consumer-api.espncricinfo.com/v1/pages/match/commentary?lang=en&seriesId=${seriesId}&matchId=${eventId}&sortDirection=DESC&innings=${currentInnings}`;
            const commentaryV1Res = await axios.get(commentaryV1Url, { headers: ESPN_HEADERS, timeout: 8000 });
            const commentaryV1Data = commentaryV1Res.data;

            if (commentaryV1Data?.comments?.length > 0) {
                commentaryV1Data.comments.slice(0, 20).forEach((c: any) => {
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
            }
        } catch (err) {
             console.warn('[API] Recovery fallback: Consumer commentary failed');
        }

        // Secondary Fallback: Ball-by-ball plays from summaryData (if primary failed or empty)
        if (commentary.filter(c => c.isPlay).length === 0) {
            const plays = summaryData.plays || {};
            const playArray = Array.isArray(plays) ? plays : Object.values(plays);
            
            if (playArray.length > 0) {
                playArray.sort((a: any, b: any) => (b.sequence || 0) - (a.sequence || 0))
                .slice(0, 15)
                .forEach((p: any) => {
                    let type = 'normal';
                    let scoreVal = (p.scoreValue !== undefined) ? Number(p.scoreValue) : (p.runs !== undefined ? Number(p.runs) : 0);
                    
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
                        over: p.over?.number !== undefined ? `${p.over.number}.${p.over.ball || 0}` : (p.over?.label || '0'),
                        ball: p.title || p.text || '',
                        type: type,
                        runs: scoreVal,
                        isPlay: true
                    });
                });
            }
        }
    }

    // === 1d. CRICBUZZ SCRAPER FALLBACK (Independent and Resilient) ===
    if (commentary.filter(c => c.isPlay).length < 5) {
        try {
            const abbrev1 = team1?.team?.abbreviation?.toLowerCase() || '';
            const abbrev2 = team2?.team?.abbreviation?.toLowerCase() || '';
            const short1 = team1?.team?.shortDisplayName?.toLowerCase() || '';
            const short2 = team2?.team?.shortDisplayName?.toLowerCase() || '';
            
            // Cricbuzz IPL matches list - use dynamic year detection
            const currentYear = new Date().getFullYear();
            const cbListUrl = `https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-${currentYear}/matches`;
            const cbListRes = await axios.get(cbListUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                timeout: 4000
            }).catch(() => axios.get(`https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/matches`, { timeout: 4000 }));

            const cbHtml: string = cbListRes.data;
            const matchLinkRegex = new RegExp(`/live-cricket-scores/(\\d+)/[\\w-]+`, 'g');
            const allLinks = [...cbHtml.matchAll(matchLinkRegex)];
            let cbMatchId = '';
            
            for (const link of allLinks) {
                const l = link[0].toLowerCase();
                if (((abbrev1 && l.includes(abbrev1)) || (short1 && l.includes(short1))) &&
                    ((abbrev2 && l.includes(abbrev2)) || (short2 && l.includes(short2)))) {
                    cbMatchId = link[1];
                    break;
                }
            }
            
            if (cbMatchId) {
                const pages = [`live-cricket-scores`, `live-cricket-full-commentary`];
                for (const pageType of pages) {
                    const scoreUrl = `https://www.cricbuzz.com/${pageType}/${cbMatchId}`;
                    const scoreRes = await axios.get(scoreUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                        timeout: 5000
                    });
                    const html = scoreRes.data;
                    const p1 = html.matchAll(/<span class="cb-com-ovr">(\d+\.\d+)<\/span>.*?<p class="cb-com-ln">([\s\S]*?)<\/p>/g);
                    const p2 = html.matchAll(/font-bold.*?>(\d+\.\d+)<[\s\S]*?><div>([\s\S]*?)<\/div>/g);
                    
                    [...p1, ...p2].forEach(m => {
                        const overVal = m[1];
                        let text = m[2].replace(/<[^>]*>/g, '').trim();
                        if (text.length > 5 && !text.match(/Match Progress|Innings Break|drinks/i)) {
                            commentary.push({
                                over: overVal,
                                ball: `🏏 [PULSE-B] ${text}`,
                                type: (text.toLowerCase().includes('out') || text.toLowerCase().includes('wicket')) ? 'wicket' : 'normal',
                                isPlay: true
                            });
                        }
                    });
                    if (commentary.filter(c => c.isPlay).length > 8) break; 
                }
            }
        } catch (e) {
            console.warn('[Cricbuzz] Fallback failed');
        }
    }

    // === FINAL GOOGLE SCRAPER FALLBACK ===
    if (commentary.filter(c => c.isPlay).length < 5) {
        try {
            const query = encodeURIComponent(`${result.team_a} vs ${result.team_b} live commentary ball by ball`);
            const googleUrl = `https://www.google.com/search?q=${query}&t=${Date.now()}`;
            const googleRes = await axios.get(googleUrl, { 
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, 
                timeout: 5000 
            });
            const html = googleRes.data;
            const patterns = [
                /(\d+\.\d+)\s*[:]\s*([\s\S]*?)<\/(?:td|div|span)>/g,
                /class="imso-regular-font">(\d+\.\d+)\s*:\s*([\s\S]*?)<\//g,
                /(\d+\.\d+)\s*(?:runs?|wicket)\s+([\s\S]*?)<\//gi
            ];
            
            patterns.forEach(p => {
                const matches = [...html.matchAll(p)];
                matches.forEach(m => {
                    const overVal = m[1];
                    let rawText = m[2].replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
                    if (rawText && rawText.length > 10 && rawText.length < 500 && !rawText.match(/feedback|privacy|settings|terms/i)) {
                        commentary.push({
                            over: overVal,
                            ball: `🌐 [PULSE-G] ${rawText}`,
                            type: (rawText.toLowerCase().includes('out') || rawText.toLowerCase().includes('wicket')) ? 'wicket' : 'normal',
                            isPlay: true
                        });
                    }
                });
            });
        } catch (e) {
            console.warn('[Google] Fallback failed');
        }
    }

    // === DEDUPLICATION & STABLE ID GENERATION ===
    const seenBalls = new Set();
    const finalCommentary: any[] = [];
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
        if (item.isPlay) {
            if (seenBalls.has(item.over)) return;
            seenBalls.add(item.over);
        }
        const contentHash = Buffer.from(item.ball).toString('base64').substring(0, 8);
        item.id = `${item.over}-${contentHash}`;
        finalCommentary.push(item);
    });

    finalCommentary.sort((a: any, b: any) => parseFloat(b.over) - parseFloat(a.over));

    // === AI LIVE NARRATION ===
    if (mappedStatus === 'LIVE') {
        const lastBall = result.overs;
        const cacheKey = result.match_id;
        const now = Date.now();
        if (!(global as any)._narrationTimestamps) (global as any)._narrationTimestamps = {};
        const lastTime = (global as any)._narrationTimestamps[cacheKey] || 0;
        const inCooldown = (now - lastTime) < 60000;

        if (!narrationCache[cacheKey] || (narrationCache[cacheKey].ball !== lastBall && !inCooldown)) {
            try {
                const recentSlice = finalCommentary.slice(0, 5);
                const aiNarrative = await generateLiveNarration(result, recentSlice);
                narrationCache[cacheKey] = { text: aiNarrative, ball: lastBall };
                (global as any)._narrationTimestamps[cacheKey] = now;
            } catch (e) {
                console.warn('[AI] Narration failed');
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

    // SYNC TO SUPABASE
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
            console.warn('[Supabase] Sync failed');
        }
    }

    // === POPULATE LAST BALLS ===
    const verifiedPlays = commentary.filter((c: any) => c.isPlay === true);
    let finalBallSource = verifiedPlays;
    if (finalBallSource.length === 0) {
        finalBallSource = commentary.filter((c: any) => 
            c.over && c.ball && /^\d+\.\d+/.test(c.over) && 
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

        return { value: val, is_wicket: isWicket, timestamp: new Date().toISOString(), over: c.over };
    }).reverse();

    // === PLAYER STATS ===
    if (summaryData) {
        const situ = summaryData.situation;
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

        if (result.batters.length === 0) {
            const rosters = summaryData.rosters || [];
            rosters.forEach((roster: any) => {
                (roster.roster || []).forEach((p: any) => {
                    const stats = p.linescores?.[0]?.linescores?.[0]?.statistics || p.linescores?.[0]?.statistics;
                    if (!stats || !stats.batting) return;
                    const bat = stats.batting;
                    const runs = Number(bat.runs || 0);
                    const balls = Number(bat.ballsFaced || 0);
                    if (!bat.outDetails && (runs > 0 || balls > 0)) {
                        result.batters.push({
                            name: p.athlete?.displayName || 'Unknown',
                            runs, balls,
                            fours: Number(bat.fours || 0),
                            sixes: Number(bat.sixes || 0),
                            strikeRate: Number(bat.strikeRate || 0) || (runs / Math.max(1, balls)) * 100,
                            isBatting: result.batters.length === 0
                        });
                    }
                });
            });
        }
        result.batters = result.batters.slice(0, 2);

        if (situ?.bowler1) {
            const overs = situ.bowler1.overs || 0;
            result.bowlers.push({
                name: situ.bowler1.athlete?.displayName || 'Bowler',
                overs, runs: situ.bowler1.conceded || 0, wickets: situ.bowler1.wickets || 0,
                economy: overs > 0 ? parseFloat(((situ.bowler1.conceded || 0) / overs).toFixed(2)) : 0
            });
        }

        if (result.bowlers.length === 0) {
            const rosters = summaryData.rosters || [];
            rosters.forEach((roster: any) => {
                (roster.roster || []).forEach((player: any) => {
                    const innerLs = player.linescores?.[0]?.linescores?.[0] || player.linescores?.[0];
                    if (!innerLs) return;
                    const stats = innerLs.statistics?.[0]?.stats || innerLs.statistics?.bowling?.stats;
                    if (!stats) return;
                    const getStatVal = (name: string) => {
                        const s = Array.isArray(stats) ? stats.find((st: any) => st.name === name) : null;
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
            result.bowlers.sort((a: any, b: any) => (parseFloat(b.overs) || 0) - (parseFloat(a.overs) || 0));
            if (result.bowlers.length > 1) result.bowlers = [result.bowlers[0]];
        }

        const odds = summaryData.odds?.[0];
        if (odds?.homeTeamOdds && odds?.awayTeamOdds) {
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
    }

    return result;
}

/**
 * UTILITY: Finds Cricbuzz Match ID based on team names
 */
async function findCricbuzzMatchId(team1: any, team2: any) {
    try {
        const t1 = team1.team?.shortDisplayName?.toLowerCase() || '';
        const t2 = team2.team?.shortDisplayName?.toLowerCase() || '';
        const currentYear = new Date().getFullYear();
        const url = `https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-${currentYear}/matches`;
        
        const res = await axios.get(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0' }, 
            timeout: 4000 
        }).catch(() => axios.get(`https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/matches`, { timeout: 4000 }));

        const html = res.data;
        // Search for a link that contains both team names
        const match = html.match(new RegExp(`/live-cricket-scores/(\\d+)/[\\w-]*${t1}[\\w-]*${t2}`, 'i')) || 
                      html.match(new RegExp(`/live-cricket-scores/(\\d+)/[\\w-]*${t2}[\\w-]*${t1}`, 'i'));
                      
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

/**
 * UTILITY: Fetches commentary from Cricbuzz
 */
async function fetchCricbuzzCommentary(cbId: string) {
    const comms: any[] = [];
    try {
        const res = await axios.get(`https://www.cricbuzz.com/live-cricket-scores/${cbId}`, { 
            headers: { 'User-Agent': 'Mozilla/5.0' }, 
            timeout: 5000 
        });
        const matches = res.data.matchAll(/cb-com-ovr">(\d+\.\d+)<\/span>.*?cb-com-ln">([\s\S]*?)<\/p>/g);
        for (const m of matches) {
            const text = m[2].replace(/<[^>]*>/g, '').trim();
            comms.push({
                over: m[1],
                ball: `🏏 [PULSE-B] ${text}`,
                type: (text.toLowerCase().includes('out') || text.toLowerCase().includes('wicket')) ? 'wicket' : 'normal',
                isPlay: true
            });
        }
    } catch {}
    return comms;
}

/**
 * UTILITY: Fetches commentary from Google Search results
 */
async function fetchGoogleCommentary(t1: string, t2: string) {
    const comms: any[] = [];
    try {
        const q = encodeURIComponent(`${t1} vs ${t2} live commentary ball by ball`);
        const res = await axios.get(`https://www.google.com/search?q=${q}`, { 
            headers: { 'User-Agent': 'Mozilla/5.0' }, 
            timeout: 5000 
        });
        const html = res.data;
        // Look for "15.4: Text description" pattern
        const matches = html.matchAll(/(\d+\.\d+)\s*:\s*([\s\S]*?)<\//g);
        for (const m of matches) {
            const text = m[2].replace(/<[^>]*>/g, ' ').trim();
            if (text.length > 20 && text.length < 500) {
                comms.push({
                    over: m[1],
                    ball: `🌐 [PULSE-G] ${text}`,
                    type: (text.toLowerCase().includes('wicket') || text.toLowerCase().includes('out')) ? 'wicket' : 'normal',
                    isPlay: true
                });
            }
        }
    } catch {}
    return comms;
}
