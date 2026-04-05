const axios = require('axios');

const seriesId = '1510719';
const matchId = '1527681';

async function testWwwApi() {
  const url = `https://www.espncricinfo.com/api/v1/pages/match/commentary?lang=en&seriesId=${seriesId}&matchId=${matchId}`;
  
  try {
    console.log(`Testing WWW API: ${url}`);
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
    console.log('Success! Items found:', res.data.content?.comments?.length || 0);
    if (res.data.content?.comments?.[0]) {
        console.log('Latest entry:', res.data.content.comments[0].commentaryText?.substring(0, 100));
    }
  } catch (e) {
    console.log('Failed:', e.message);
  }
}

testWwwApi();
