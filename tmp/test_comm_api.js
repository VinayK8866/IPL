const axios = require('axios');

const matchId = '1527681';

async function testNewCommentaryApi() {
  const urls = [
    `https://site.web.api.espn.com/apis/site/v2/sports/cricket/commentary?event=${matchId}`,
    `https://site.api.espn.com/apis/site/v2/sports/cricket/commentary?event=${matchId}`
  ];

  for (const url of urls) {
    try {
      console.log(`Testing URL: ${url}`);
      const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
      console.log('Success! Items found:', res.data.commentary?.length || 0);
      if (res.data.commentary?.[0]) {
        console.log('Latest entry:', res.data.commentary[0].text);
      }
    } catch (e) {
      console.log('Failed:', e.message);
    }
  }
}

testNewCommentaryApi();
