const axios = require('axios');
const fs = require('fs');

async function dumpScoreboard() {
    const SERIES_ID = '1510719';
    const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${SERIES_ID}/scoreboard`;
    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    try {
        const res = await axios.get(url, { headers: HEADERS });
        fs.writeFileSync('tmp/scoreboard_dump.json', JSON.stringify(res.data, null, 2));
        console.log('Dumped scoreboard to tmp/scoreboard_dump.json');
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
}

dumpScoreboard();
