const axios = require('axios');

async function checkVercelApi() {
    const url = 'https://ipl-pudx.vercel.app/api/match/1510719-1527679';
    try {
        const res = await axios.get(url);
        const commentary = res.data.live_commentary || [];
        console.log(`Live commentary count: ${commentary.length}`);
        
        commentary.forEach((c, i) => {
            console.log(`[${i}] Over: ${c.over} | Type: ${c.type} | Runs: ${c.runs} | Ball: ${c.ball.substring(0, 50)}...`);
        });
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
}

checkVercelApi();
