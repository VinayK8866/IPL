const axios = require('axios');

const EVENT_ID = '1527678';
const SERIES_ID = '1510719';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function bruteForce() {
    console.log(`--- BRUTE FORCING ESPN API PATTERNS ---`);
    const patterns = [
        `https://site.api.espn.com/apis/site/v2/sports/cricket/series/${SERIES_ID}/events/${EVENT_ID}/commentary`,
        `https://site.web.api.espn.com/apis/site/v2/sports/cricket/series/${SERIES_ID}/events/${EVENT_ID}/commentary`,
        `https://site.api.espn.com/apis/site/v2/sports/cricket/commentary?event=${EVENT_ID}`,
        `https://site.api.espn.com/apis/site/v2/sports/cricket/summary?event=${EVENT_ID}`,
        `https://site.api.espn.com/apis/site/v2/sports/cricket/series/${SERIES_ID}/events/${EVENT_ID}/summary`,
        `https://site.api.espn.com/apis/site/v2/sports/cricket/scoreboard`,
        `https://site.api.espn.com/apis/site/v2/sports/cricket/leagues/india-premier-league/events/${EVENT_ID}`
    ];

    for (const url of patterns) {
        console.log(`Testing: ${url}`);
        try {
            const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
            console.log(`  [SUCCESS] Status: ${res.status} | Keys: ${Object.keys(res.data).join(', ')}`);
            if (res.data.commentary) {
                console.log(`  >>> FOUND COMMENTARY: ${res.data.commentary.length} items`);
            }
            if (res.data.plays) {
                console.log(`  >>> FOUND PLAYS: ${res.data.plays.length} items`);
            }
        } catch (err) {
            console.log(`  [FAILED] ${err.message}`);
        }
    }
}

bruteForce();
