const axios = require('axios');

const seriesId = '1510719';
const matchId = '1527681';

async function checkCorrectSeries() {
  const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${matchId}&t=${Date.now()}`;
  
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
    console.log('--- Correct Series Summary ---');
    console.log('Status:', res.data.header?.status?.summary);
    console.log('Plays Length:', res.data.plays?.length || 0);
    if (res.data.plays?.[0]) {
      console.log('Latest Play:', res.data.plays[0].text);
    }
  } catch (e) {
    console.log('Failed:', e.message);
  }
}

checkCorrectSeries();
