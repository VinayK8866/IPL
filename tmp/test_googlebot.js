const axios = require('axios');

const URL = 'https://www.google.com/search?q=ipl+lsg+vs+dc+live+score+commentary';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
};

async function testGoogleBot() {
    console.log(`--- TESTING GOOGLEBOT SCRAPING ---`);
    try {
        const res = await axios.get(URL, { headers: HEADERS, timeout: 10000 });
        const html = res.data;
        console.log(`HTML Length: ${html.length}`);
        
        // Search for commentary snippets
        if (html.includes('commentary') || html.includes('Need')) {
            console.log(`Commentary-like text found!`);
            // Save a snippet to see what it looks like
            const snippet = html.slice(html.indexOf('commentary'), html.indexOf('commentary') + 500);
            console.log(`Snippet: ${snippet}`);
        } else {
            console.log(`No commentary indicators found in HTML.`);
        }
    } catch (err) {
        console.log(`Error: ${err.message}`);
    }
}

testGoogleBot();
