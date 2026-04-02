const axios = require('axios');
const fs = require('fs');

async function dumpSummary() {
    const SERIES_ID = '1510719';
    const EVENT_ID = '1527679';
    const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${SERIES_ID}/summary?event=${EVENT_ID}`;
    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    try {
        const res = await axios.get(url, { headers: HEADERS });
        fs.writeFileSync('tmp/summary_dump.json', JSON.stringify(res.data, null, 2));
        console.log('Dumped summary to tmp/summary_dump.json');
        
        console.log('Keys available:', Object.keys(res.data));
        if (res.data.commentary) console.log('Commentary count:', res.data.commentary.length);
        if (res.data.plays) console.log('Plays count:', res.data.plays.length);
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
}

dumpSummary();
