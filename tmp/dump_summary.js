const axios = require('axios');
const fs = require('fs');

const EVENT_ID = '1527678';
const SERIES_ID = '1510719';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function dumpSummary() {
    console.log(`--- DUMPING SUMMARY JSON (1510719/1527678) ---`);
    const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/1510719/summary?event=${EVENT_ID}`;
    try {
        const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
        console.log(`  [SUCCESS] Status: ${res.status}`);
        fs.writeFileSync('e:/SaaS Apps/IPL/tmp/summary_full.json', JSON.stringify(res.data, null, 2));
        console.log(`Saved full response to e:/SaaS Apps/IPL/tmp/summary_full.json`);
    } catch (err) {
        console.log(`  [FAILED] ${err.message}`);
    }
}

dumpSummary();
