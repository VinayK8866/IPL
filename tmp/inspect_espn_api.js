const axios = require('axios');

const EVENT_ID = '1527678';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function test(name, url) {
    console.log(`--- TESTING ${name} (${url}) ---`);
    try {
        const res = await axios.get(url, { headers: HEADERS });
        console.log(`Status:`, res.status);
        console.log(`Keys:`, Object.keys(res.data));
        if (res.data.competitions) {
             console.log('Competitions found on root object');
        }
    } catch (err) {
        console.log(`${name} Failed:`, err.message);
    }
}

async function run() {
    await test('CORE API (UK)', `http://core.espnuk.org/v2/sports/cricket/leagues/1510719/events/${EVENT_ID}`);
    await test('ROOT API', `https://site.api.espn.com/apis/site/v2/sports/cricket/summary?event=${EVENT_ID}`);
}

run();
