const axios = require('axios');

async function testScrapers() {
    const result = {
        team_a: "Mumbai Indians",
        team_b: "Punjab Kings"
    };
    
    console.log("Testing Cricbuzz Scraper...");
    try {
        const t1 = result.team_a.split(' ')[0].toLowerCase();
        const t2 = result.team_b.split(' ')[0].toLowerCase();
        
        const cbListUrl = `https://www.cricbuzz.com/cricket-series/9241/indian-premier-league-2026/matches`;
        const cbListRes = await axios.get(cbListUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 4000
        });
        const cbHtml = cbListRes.data;
        
        const matchLinkRegex = new RegExp(`/live-cricket-scores/(\\d+)/[\\w-]+`, 'g');
        const allLinks = [...cbHtml.matchAll(matchLinkRegex)];
        let cbMatchId = '';
        
        for (const link of allLinks) {
            const linkText = link[0].toLowerCase();
            if (linkText.includes(t1) && linkText.includes(t2)) {
                cbMatchId = link[1];
                break;
            }
        }
        
        console.log("Cricbuzz Match ID:", cbMatchId);
        if (cbMatchId) {
            const scoreUrl = `https://www.cricbuzz.com/live-cricket-scores/${cbMatchId}`;
            const scoreRes = await axios.get(scoreUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                timeout: 5000
            });
            const scoreHtml = scoreRes.data;
            const commRegex = /<span class="cb-com-ovr">(\d+\.\d+)<\/span>.*?<p class="cb-com-ln">([\s\S]*?)<\/p>/g;
            const commMatches = [...scoreHtml.matchAll(commRegex)];
            console.log(`Found ${commMatches.length} Cricbuzz items`);
            commMatches.slice(0, 3).forEach(m => console.log(`[CB] ${m[1]}: ${m[2].replace(/<[^>]*>/g, '').substring(0, 50)}...`));
        }
    } catch (e) {
        console.error("Cricbuzz failed:", e.message);
    }

    console.log("\nTesting Google Scraper...");
    try {
        const query = encodeURIComponent(`${result.team_a} vs ${result.team_b} live commentary`);
        const googleUrl = `https://www.google.com/search?q=${query}`;
        const googleRes = await axios.get(googleUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, 
            timeout: 5000 
        });
        const html = googleRes.data;
        const pattern1 = html.matchAll(/(\d+\.\d+)\s*[:]\s*([\s\S]*?)<\/(?:td|div|span)>/g);
        const pattern2 = html.matchAll(/class="imso-regular-font">(\d+\.\d+)\s*:\s*([\s\S]*?)<\//g);
        const matches = [...pattern1, ...pattern2];
        console.log(`Found ${matches.length} Google items`);
        matches.slice(0, 3).forEach(m => console.log(`[G] ${m[1]}: ${m[2].replace(/<[^>]*>/g, '').substring(0, 50)}...`));
    } catch (e) {
        console.error("Google failed:", e.message);
    }
}

testScrapers();
