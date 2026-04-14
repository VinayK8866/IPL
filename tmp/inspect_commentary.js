const axios = require('axios');
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };
const SERIES_IDS = ['1510719', '8048', '1527930', '1508731'];

async function test() {
    for (const seriesId of SERIES_IDS) {
        const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/scoreboard`;
        try {
            const res = await axios.get(scoreboardUrl, { headers: HEADERS });
            const events = res.data.events || [];
            if (events.length > 0) {
                const eventId = events[0].id;
                console.log(`Checking series ${seriesId}, event ${eventId}`);
                const commentaryUrl = `https://hs-consumer-api.espncricinfo.com/v1/pages/match/commentary?lang=en&seriesId=${seriesId}&matchId=${eventId}&sortDirection=DESC`;
                const cRes = await axios.get(commentaryUrl, { headers: HEADERS });
                const comments = cRes.data.comments || [];
                console.log(`Got ${comments.length} comments`);
                if (comments.length > 0) {
                    console.log(JSON.stringify(comments.slice(0, 3), null, 2));
                    return;
                }
            }
        } catch (err) {
            console.log(`Failed series ${seriesId}: ${err.message}`);
        }
    }
}

test();
