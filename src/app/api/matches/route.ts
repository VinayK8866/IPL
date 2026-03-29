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

export async function GET() {
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
            const summary = status.summary || '';
            
            let mappedStatus: 'LIVE' | 'RESULT' | 'UPCOMING' = 'UPCOMING';
            if (state === 'in') mappedStatus = 'LIVE';
            else if (state === 'post') mappedStatus = 'RESULT';

            const team1 = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
            const team2 = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

            if (!team1 || !team2) continue;

            const matchObj = {
                id: event.id || Math.random().toString(),
                name: event.name || `${team1.team?.displayName} vs ${team2.team?.displayName}`,
                series: seriesName,
                status: mappedStatus,
                statusText: summary || detail || status.type?.description || '',
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
                winProbA: team1.curatedRank === '1' ? 0.6 : 0.4,
                winProbB: team2.curatedRank === '1' ? 0.6 : 0.4,
            };

            // SYNC TO SUPABASE (FREE PERSISTENCE)
            await upsertMatchToSupabase(matchObj);
            
            // RESOLVE BETS IF LIVE
            if (mappedStatus === 'LIVE') {
                await resolveBetsForMatch(matchObj.id, seriesId);
            }

            allMatches.push(matchObj);
        }
    }

    const sortedMatches = allMatches.sort((a, b) => {
        const order = { 'LIVE': 0, 'UPCOMING': 1, 'RESULT': 2 };
        return order[a.status as keyof typeof order] - order[b.status as keyof typeof order];
    });

    return NextResponse.json({ matches: sortedMatches, timestamp: new Date().toISOString() });
  } catch (err: any) {
    console.error('[GLOBAL API ERROR]', err.message);
    return NextResponse.json({ matches: [], error: err.message }, { status: 500 });
  }
}


