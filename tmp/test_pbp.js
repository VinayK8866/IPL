const axios = require('axios');

const EVENT_ID = '1527678';
const SERIES_ID = '1510719';

async function testPbp() {
    console.log(`--- TESTING ESPN PLAY-BY-PLAY API ---`);
    const urls = [
        `https://site.api.espn.com/apis/site/v2/sports/cricket/${SERIES_ID}/events/${EVENT_ID}/playbyplay`,
        `https://site.api.espn.com/apis/site/v2/sports/cricket/8048/events/${EVENT_ID}/playbyplay`,
        `https://site.api.espn.com/apis/site/v2/sports/cricket/events/${EVENT_ID}/playbyplay`
    ];

    for (const url of urls) {
        console.log(`Testing: ${url}`);
        try {
            const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
            console.log(`  [SUCCESS] PlayByPlay events: ${res.data.events?.length || 0}`);
            if (res.data.events?.[0]) {
                console.log(`  First item:`, JSON.stringify(res.data.events[0], null, 2).slice(0, 500));
            }
        } catch (err) {
            console.log(`  [FAILED] ${err.message}`);
        }
    }
}

testPbp();
