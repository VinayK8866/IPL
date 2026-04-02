const axios = require('axios');

async function checkMatch5() {
    console.log(`--- MATCH 5 STATUS (1510719/1527678) ---`);
    const url = 'https://site.api.espn.com/apis/site/v2/sports/cricket/1510719/scoreboard';
    try {
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const event = res.data.events?.find(e => String(e.id) === '1527678');
        if (event) {
            console.log(`${event.name}: ${event.status.type.state} (${event.status.summary})`);
            console.log(`Competitions[0] situation:`, JSON.stringify(event.competitions[0].situation || {}, null, 2));
        } else {
            console.log(`Match 1527678 not found in current scoreboard.`);
        }
    } catch (err) {
        console.log(`Error: ${err.message}`);
    }
}

checkMatch5();
