const axios = require('axios');

async function checkSituation() {
    console.log(`--- CHECKING SITUATION DATA (1510719/1527678) ---`);
    const url = 'https://site.api.espn.com/apis/site/v2/sports/cricket/1510719/scoreboard';
    try {
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const competition = res.data.events?.[0]?.competitions?.[0];
        if (competition) {
            console.log(`Situation Keys: ${Object.keys(competition.situation || {})}`);
            console.log(`Situation JSON:`, JSON.stringify(competition.situation || {}, null, 2));
            console.log(`LastPlay JSON:`, JSON.stringify(competition.lastPlay || {}, null, 2));
        }
    } catch (err) {
        console.log(`Error: ${err.message}`);
    }
}

checkSituation();
