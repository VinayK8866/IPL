const axios = require('axios');

const EVENT_ID = '1527678';
const SERIES_ID = '1510719';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function testCommentary() {
    console.log(`--- TESTING ESPN COMMENTARY API ---`);
    const urls = [
        `https://site.api.espn.com/apis/site/v2/sports/cricket/${SERIES_ID}/commentary?event=${EVENT_ID}`,
        `https://site.api.espn.com/apis/site/v2/sports/cricket/summary?event=${EVENT_ID}`
    ];

    for (const url of urls) {
        console.log(`Testing: ${url}`);
        try {
            const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
            console.log(`Status:`, res.status);
            if (res.data.commentary) {
                console.log(`Commentary items found:`, res.data.commentary.length);
                console.log(`First item:`, JSON.stringify(res.data.commentary[0], null, 2));
            } else if (res.data.plays) {
                console.log(`Plays found:`, res.data.plays.length);
            } else {
                console.log(`No commentary or plays found in keys:`, Object.keys(res.data));
            }
        } catch (err) {
            console.log(`Error:`, err.message);
        }
    }
}

testCommentary();
