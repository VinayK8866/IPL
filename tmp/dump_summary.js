const axios = require('axios');

const seriesId = '8048';
const matchId = '1527681';

async function dumpEspnSummary() {
  const url = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${matchId}&t=${Date.now()}`;
  
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
    const data = res.data;

    console.log('--- Summary Dump ---');
    console.log('Status Header:', data.header?.status?.summary);
    console.log('Plays Length:', data.plays?.length || 0);
    console.log('First Play:', JSON.stringify(data.plays?.[0] || {}, null, 2));
    console.log('Notes Length:', data.notes?.length || 0);
    console.log('First Note:', JSON.stringify(data.notes?.[0] || {}, null, 2));

  } catch (e) {
    console.log('Failed:', e.message);
  }
}

dumpEspnSummary();
