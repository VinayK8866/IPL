const axios = require('axios');

const EVENT_ID = '1527678';
const SERIES_ID = '1510719';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://www.espncricinfo.com/'
};

async function testMatchDetails() {
    console.log(`--- TESTING CRICINFO MATCH DETAILS API ---`);
    const urls = [
        `https://hs-consumer-api.espncricinfo.com/v1/pages/match/details?lang=en&seriesId=${SERIES_ID}&matchId=${EVENT_ID}`,
        `https://hs-consumer-api.espncricinfo.com/v1/pages/match/home?lang=en&seriesId=${SERIES_ID}&matchId=${EVENT_ID}`,
        `https://hs-consumer-api.espncricinfo.com/v1/pages/match/commentary?lang=en&seriesId=${SERIES_ID}&matchId=${EVENT_ID}&page=1`
    ];
    
    for (const url of urls) {
        console.log(`Testing: ${url}`);
        try {
            const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
            console.log(`  [SUCCESS] Status: ${res.status} | Data type: ${typeof res.data}`);
            if (res.data.match) {
                console.log(`  Match Name: ${res.data.match.name}`);
            }
            if (res.data.content?.matchCommentary) {
                console.log(`  COMMENTARY FOUND in matchCommentary!`);
            } else if (res.data.content?.comments) {
                console.log(`  COMMENTARY FOUND in content.comments!`);
            }
        } catch (err) {
            console.log(`  [FAILED] ${err.message}`);
        }
    }
}

testMatchDetails();
