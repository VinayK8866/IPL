import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  // Common active series IDs: 8048 (IPL), 1527930 (Men's PM Cup), 1508731 (Pro50)
  const SERIES_IDS = ['8048', '1527930', '1508731'];
  
  try {
    const fetchPromises = SERIES_IDS.map(id => 
        axios.get(`https://site.api.espn.com/apis/site/v2/sports/cricket/${id}/scoreboard?t=${Date.now()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        }).catch(err => {
            console.error(`[API ERROR] Series ${id}:`, err.message);
            return { data: { events: [] } };
        })
    );

    const responses = await Promise.all(fetchPromises);
    const allMatches: any[] = [];

    responses.forEach((response, idx) => {
        const data = response.data;
        const events = data.events || [];
        const seriesName = data.leagues?.[0]?.name || (SERIES_IDS[idx] === '8048' ? 'Indian Premier League' : 'International');

        const parsedMatches = events.map((event: any) => {
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

            if (!team1 || !team2) return null;

            return {
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
                }
            };
        }).filter(Boolean);

        allMatches.push(...parsedMatches);
    });

    // Sort: LIVE matches first, then upcoming, then results
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

