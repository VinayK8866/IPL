const axios = require('axios');

const seriesId = '8048';
const matchId = '1527681';

async function superFetchDiagnostic() {
  const urls = [
    { name: 'Summary V2', url: `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${matchId}` },
    { name: 'Home HS', url: `https://hs-consumer-api.espncricinfo.com/v1/pages/match/home?lang=en&seriesId=${seriesId}&matchId=${matchId}` },
    { name: 'Commentary HS', url: `https://hs-consumer-api.espncricinfo.com/v1/pages/match/commentary?lang=en&seriesId=${seriesId}&matchId=${matchId}&sortDirection=DESC` },
    { name: 'Details HS', url: `https://hs-consumer-api.espncricinfo.com/v1/pages/match/details?lang=en&seriesId=${seriesId}&matchId=${matchId}` }
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.espncricinfo.com/'
  };

  for (const item of urls) {
    try {
      console.log(`--- Testing ${item.name} ---`);
      const res = await axios.get(item.url + `&t=${Date.now()}`, { headers, timeout: 5000 });
      console.log(`${item.name} Success!`);
      
      if (item.name === 'Summary V2') {
        console.log('Plays:', res.data.plays?.length || 0);
      } else if (item.name === 'Home HS') {
        console.log('Latest Play (HS):', res.data.content?.recentBallCommentary?.[0]?.commentaryText?.substring(0, 100));
      } else if (item.name === 'Commentary HS') {
        console.log('Comments:', res.data.comments?.length || 0);
      } else if (item.name === 'Details HS') {
        console.log('Match Status:', res.data.match?.status);
      }
    } catch (e) {
      console.log(`${item.name} Failed: ${e.message}`);
    }
  }
}

superFetchDiagnostic();
