const axios = require('axios');

async function checkCricket() {
    console.log(`--- ROOT CRICKET SCOREBOARD ---`);
    const url = 'https://site.api.espn.com/apis/site/v2/sports/cricket/scoreboard';
    try {
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const events = res.data.events || [];
        console.log(`Total Events: ${events.length}`);
        events.forEach(e => {
            console.log(`${e.id}: ${e.name} (${e.status.type.state}) - ${e.status.summary}`);
        });
    } catch (err) {
        console.log(`Error: ${err.message}`);
    }
}

checkCricket();
