const axios = require('axios');
const fs = require('fs');

const MATCH_URL = 'https://www.espncricinfo.com/series/ipl-2026-1510719/lucknow-super-giants-vs-delhi-capitals-5th-match-1527678/live-cricket-score';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.espncricinfo.com/',
};

async function scrapeCricinfo() {
    console.log(`--- SCRAPING CRICINFO HTML FOR DATA ---`);
    try {
        const res = await axios.get(MATCH_URL, { headers: HEADERS, timeout: 10000 });
        const html = res.data;
        console.log(`HTML Length: ${html.length}`);
        
        // Find JSON data in script tags
        const jsonDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (jsonDataMatch && jsonDataMatch[1]) {
            const data = JSON.parse(jsonDataMatch[1]);
            console.log(`__NEXT_DATA__ Found! Keys: ${Object.keys(data.props.pageProps)}`);
            fs.writeFileSync('e:/SaaS Apps/IPL/tmp/match_data.json', jsonDataMatch[1]);
            console.log(`Saved to tmp/match_data.json`);
        } else {
            console.log(`__NEXT_DATA__ not found. Searching for other JSON markers...`);
            // Cricinfo sometimes uses a different ID for their data script
            const scriptMatch = html.match(/<script>window\.__INITIAL_STATE__=([\s\S]*?);<\/script>/);
            if (scriptMatch) {
               console.log(`Found __INITIAL_STATE__!`);
            }
        }
    } catch (err) {
        console.log(`Error: ${err.message}`);
    }
}

scrapeCricinfo();
