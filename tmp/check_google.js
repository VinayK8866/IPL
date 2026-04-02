const axios = require('axios');

const URL = 'https://www.google.com/search?q=ipl+lucknow+vs+delhi+live+score+commentary';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
};

async function checkGoogle() {
    console.log(`--- CHECKING GOOGLE SEARCH FOR COMMENTARY ---`);
    try {
        const res = await axios.get(URL, { headers: HEADERS, timeout: 5000 });
        const html = res.data;
        console.log(`HTML Length: ${html.length}`);
        
        // Google often stores match center data in a script or in specific data- attributes
        // Let's look for "Commentary" or "Need" to see if it's there
        if (html.toLowerCase().includes('commentary')) {
            console.log(`Found 'commentary' in HTML!`);
            const i = html.toLowerCase().indexOf('commentary');
            console.log(`Snippet around 'commentary':`, html.slice(i-100, i+200));
        } else {
            console.log(`No 'commentary' found.`);
        }
    } catch (err) {
        console.log(`Error: ${err.message}`);
    }
}

checkGoogle();
