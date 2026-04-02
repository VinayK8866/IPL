const axios = require('axios');

const SERIES_IDS = ['1510719', '8048', '1527930', '1508731'];
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function findLiveAndCheckPlays() {
    console.log(`--- SCANNING FOR LIVE MATCHES AND DATA STRUCTURE ---`);

    for (const sid of SERIES_IDS) {
        const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${sid}/scoreboard`;
        try {
            const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
            const events = res.data.events || [];
            
            for (const e of events) {
                console.log(`- SERIES ${sid} | EVENT ${e.id} | ${e.name} | ${e.status.type.state}`);
                if (e.status.type.state === 'in' || e.status.type.state === 'pre' || e.status.type.state === 'post') {
                    // Check summary for plays
                    const sumUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${sid}/summary?event=${e.id}`;
                    const sumRes = await axios.get(sumUrl, { headers: HEADERS, timeout: 5000 });
                    const plays = sumRes.data.plays || [];
                    
                    if (plays.length > 0) {
                        console.log(`  >>> FOUND ${plays.length} PLAYS IN ${e.name}`);
                        const sample = plays[0];
                        console.log(`  SAMPLE PLAY:`, JSON.stringify({
                            over: sample.over,
                            scoreValue: sample.scoreValue,
                            text: sample.text,
                            dismissal: !!sample.dismissal
                        }, null, 2));

                        // Check the mapping logic I implemented
                        let type = 'normal';
                        let scoreVal = sample.scoreValue || 0;
                        if (sample.dismissal) type = 'wicket';
                        else if (scoreVal === 6) type = 'six';
                        else if (scoreVal === 4) type = 'four';
                        else if (scoreVal === 0) type = 'dot';
                        else if (scoreVal > 0) type = 'runs';
                        
                        console.log(`  INFERRED TYPE: ${type} | RUNS: ${scoreVal}`);
                    }
                }
            }
        } catch (err) {
            console.log(`- SERIES ${sid} failed: ${err.message}`);
        }
    }
}

findLiveAndCheckPlays();
