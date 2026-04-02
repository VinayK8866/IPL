const axios = require('axios');

async function checkIplScoreboard() {
    console.log(`--- CHECKING IPL SCOREBOARD (ROOT 8048) ---`);
    const urls = [
        'https://site.api.espn.com/apis/site/v2/sports/cricket/8048/scoreboard',
        'https://site.api.espn.com/apis/site/v2/sports/cricket/1510719/scoreboard',
        'https://site.api.espn.com/apis/site/v2/sports/cricket/scoreboard'
    ];

    for (const url of urls) {
        console.log(`Testing: ${url}`);
        try {
            const res = await axios.get(url, { 
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000 
            });
            console.log(`  [SUCCESS] Events: ${res.data.events?.length || 0}`);
            if (res.data.events) {
                res.data.events.forEach(e => {
                    console.log(`  - ${e.id}: ${e.name} (${e.status.type.state})`);
                });
            }
        } catch (err) {
            console.log(`  [FAILED] ${err.message}`);
        }
    }
}

checkIplScoreboard();
