const axios = require('axios');

const EVENT_ID = '1527678';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function testSimpleSummary() {
    console.log(`--- TESTING SIMPLE SUMMARY API ---`);
    const urls = [
        `https://site.api.espn.com/apis/site/v2/sports/cricket/summary?event=${EVENT_ID}`,
        `https://site.api.espn.com/apis/site/v2/sports/cricket/1510719/summary?event=${EVENT_ID}`,
        `https://site.api.espn.com/apis/site/v2/sports/cricket/8048/summary?event=${EVENT_ID}`
    ];

    for (const url of urls) {
        console.log(`Testing: ${url}`);
        try {
            const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
            console.log(`  [SUCCESS] Status: ${res.status}`);
            if (res.data.plays) {
                console.log(`  >>> PLAYS FOUND: ${res.data.plays.length}`);
            } else {
                 console.log(`  Plays not found. Keys: ${Object.keys(res.data).join(', ')}`);
            }
        } catch (err) {
            console.log(`  [FAILED] ${err.message}`);
        }
    }
}

testSimpleSummary();
