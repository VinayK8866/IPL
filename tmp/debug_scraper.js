const axios = require('axios');
const SERIES_IDS = ['1510719', '8048', '1527930', '1508731'];

async function debugScraper() {
    for (const id of SERIES_IDS) {
        try {
            const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${id}/scoreboard`;
            const response = await axios.get(url);
            const events = response.data.events || [];
            console.log(`Series ${id}: Found ${events.length} events`);
            for (const event of events) {
                const competitors = event.competitions?.[0]?.competitors || [];
                console.log(`  Match: ${event.name} (ID: ${event.id}) Status: ${event.status?.type?.state}`);
                for (const c of competitors) {
                    console.log(`    Team: ${c.team?.displayName} (${c.team?.id})`);
                }
            }
        } catch (err) {
            console.error(`Series ${id} failed: ${err.message}`);
        }
    }
}

debugScraper();
