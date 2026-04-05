const axios = require('axios');

const seriesId = '8048';
const matchId = '1527681';

async function testHSConsumerWithHeaders() {
  const url = `https://hs-consumer-api.espncricinfo.com/v1/pages/match/commentary?lang=en&seriesId=${seriesId}&matchId=${matchId}&sortDirection=DESC`;
  
  try {
    console.log(`Testing HS Consumer URL: ${url}`);
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://www.espncricinfo.com',
        'Referer': 'https://www.espncricinfo.com/'
      },
      timeout: 10000
    });
    
    const comments = res.data.comments || [];
    console.log('Success! Comments found:', comments.length);
    if (comments[0]) {
      console.log('Latest Commentary Over:', comments[0].overActual);
      console.log('Latest Commentary Text:', comments[0].commentaryText?.substring(0, 100));
    }
  } catch (e) {
    console.log('Failed:', e.message, e.response?.data ? JSON.stringify(e.response.data) : '');
  }
}

testHSConsumerWithHeaders();
