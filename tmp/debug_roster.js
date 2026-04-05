const axios = require('axios');

async function debugRoster() {
    const seriesId = '8048';
    const matchId = '1527681';
    
    const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${matchId}`;
    const res = await axios.get(summaryUrl, { timeout: 10000 });
    const data = res.data;
    
    // 1. Check situation
    console.log('\n=== SITUATION ===');
    const situ = data.situation;
    if (situ) {
        console.log('Batter1:', JSON.stringify(situ.batter1, null, 2));
        console.log('Batter2:', JSON.stringify(situ.batter2, null, 2));
        console.log('Bowler1:', JSON.stringify(situ.bowler1, null, 2));
    } else {
        console.log('NO SITUATION DATA');
    }
    
    // 2. Check roster structure for first batting player
    console.log('\n=== ROSTER STRUCTURE (first player with linescores) ===');
    const rosters = data.rosters || [];
    for (const roster of rosters) {
        console.log(`\nTeam: ${roster.team?.displayName} (ID: ${roster.team?.id})`);
        for (const player of (roster.roster || []).slice(0, 3)) {
            console.log(`  Player: ${player.athlete?.displayName}`);
            console.log(`  linescores keys:`, JSON.stringify(Object.keys(player.linescores?.[0] || {})));
            
            // Check nested linescores
            const ls0 = player.linescores?.[0];
            if (ls0?.linescores) {
                console.log(`  ls0.linescores count:`, ls0.linescores.length);
                for (const innerLs of ls0.linescores) {
                    console.log(`    inner ls keys:`, Object.keys(innerLs));
                    if (innerLs.statistics?.categories) {
                        const cats = innerLs.statistics.categories;
                        for (const cat of cats) {
                            console.log(`    category: ${cat.name}, stats:`, cat.stats?.map(s => `${s.name}=${s.value}`).join(', '));
                        }
                    }
                }
            }
            
            // Check direct statistics
            if (ls0?.statistics) {
                console.log(`  Direct stats:`, JSON.stringify(Object.keys(ls0.statistics)));
                if (ls0.statistics.batting) {
                    console.log(`  batting:`, JSON.stringify(ls0.statistics.batting));
                }
            }
        }
    }
    
    // 3. Check competitors for isBatting detection
    console.log('\n=== COMPETITORS ===');
    const comps = data.event?.competitions?.[0]?.competitors || data.header?.competitions?.[0]?.competitors || [];
    for (const c of comps) {
        console.log(`  ${c.team?.displayName}: homeAway=${c.homeAway}, score=${c.score}, curatedRank=${c.curatedRank}`);
        const ls = c.linescores || [];
        for (let i = 0; i < ls.length; i++) {
            console.log(`    linescore[${i}]: isBatting=${ls[i].isBatting}, isCurrent=${ls[i].isCurrent}, overs=${ls[i].overs}, displayValue=${ls[i].displayValue}`);
        }
    }

    // 4. Check notes
    console.log('\n=== NOTES COUNT ===');
    console.log('Notes:', (data.notes || []).length);
    
    // 5. Check commentary from hs-consumer-api
    console.log('\n=== HS-CONSUMER-API COMMENTARY ===');
    try {
        const commentaryUrl = `https://hs-consumer-api.espncricinfo.com/v1/pages/match/commentary?lang=en&seriesId=${seriesId}&matchId=${matchId}&sortDirection=DESC`;
        const commentaryRes = await axios.get(commentaryUrl, { timeout: 5000 });
        const comments = commentaryRes.data?.comments || [];
        console.log(`Total comments: ${comments.length}`);
        for (const c of comments.slice(0, 5)) {
            console.log(`  Over ${c.overActual || c.overNumber}: [W:${c.isWicket},4:${c.isFour},6:${c.isSix}] runs=${c.runs} "${(c.title || '').substring(0, 80)}"`);
        }
    } catch (e) {
        console.log('Commentary API failed:', e.message);
    }
}

debugRoster().catch(console.error);
