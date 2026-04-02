const axios = require('axios');

const EVENT_ID = '1527678';
const SERIES_ID = '1510719';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.espncricinfo.com/'
};

async function testModernApi() {
    console.log(`--- TESTING MODERN CRICINFO API (v2) ---`);
    const urls = [
        `https://hs-consumer-api.espncricinfo.com/v1/pages/match/commentary?lang=en&seriesId=${SERIES_ID}&matchId=${EVENT_ID}&page=1`,
        `https://site.api.espn.com/apis/site/v2/sports/cricket/summary?event=${EVENT_ID}`
    ];
    
    for (const url of urls) {
        console.log(`Testing: ${url}`);
        try {
            const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
            console.log(`Status:`, res.status);
            if (res.data.content?.comments) {
                console.log(`Found ${res.data.content.comments.length} comments!`);
            } else if (res.data.comments) {
                console.log(`Found ${res.data.comments.length} comments!`);
            } else {
                console.log(`Success but no comments found:`, Object.keys(res.data));
            }
        } catch (err) {
            console.log(`Error:`, err.message);
        }
    }
}

testModernApi();
