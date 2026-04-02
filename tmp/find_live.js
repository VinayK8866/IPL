const axios = require('axios');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function findLive() {
    console.log(`--- SCANNING ALL ESPN CRICKET LEAGUES FOR LIVE MATCHES ---`);
    const LEAGUE_SLUGS = ['india-premier-league', 'icc-cricket-world-cup', 'pakistan-super-league'];

    for (const slug of LEAGUE_SLUGS) {
        const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${slug}/scoreboard`;
        console.log(`Scanning: ${slug}...`);
        try {
            const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
            const events = res.data.events || [];
            if (events.length > 0) {
                console.log(`Found ${events.length} events in ${slug}`);
                events.forEach(e => {
                   console.log(`- EVENT ID: ${e.id} | NAME: ${e.name} | STATE: ${e.status.type.state} | SUMMARY: ${e.status.summary}`);
                   if (e.status.type.state === 'in') {
                       console.log(`  >>> LIVE ID DETECTED: ${e.id}`);
                   }
                });
            }
        } catch (err) {
            console.log(`Failed ${slug}: ${err.message}`);
        }
    }
}

findLive();
