const axios = require('axios');

const seriesId = '8048';
const matchId = '1527681';

async function checkEspnData() {
  try {
    console.log(`--- Checking ESPN Data for Match ${matchId} ---`);
    
    // 1. Scoreboard Check
    const sbUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/scoreboard?t=${Date.now()}`;
    const sbRes = await axios.get(sbUrl);
    const event = sbRes.data.events.find(e => e.id === matchId);
    console.log('Scoreboard Status:', event?.status?.type?.shortDetail);
    console.log('Scoreboard Clock/Summary:', event?.status?.summary);

    // 2. Summary Check
    const sumUrl = `https://site.api.espn.com/apis/site/v2/sports/cricket/${seriesId}/summary?event=${matchId}&t=${Date.now()}`;
    const sumRes = await axios.get(sumUrl);
    const lastPlay = sumRes.data.plays?.[sumRes.data.plays?.length - 1];
    console.log('Last Play Over:', lastPlay?.over?.number, '.', lastPlay?.over?.ball);
    console.log('Last Play Text:', lastPlay?.text);

    // 3. Commentary V1 Check
    const commUrl = `https://hs-consumer-api.espncricinfo.com/v1/pages/match/commentary?lang=en&seriesId=${seriesId}&matchId=${matchId}`;
    try {
        const commRes = await axios.get(commUrl);
        const lastComm = commRes.data.comments?.[0];
        console.log('Last Commentary Over:', lastComm?.overActual);
        console.log('Last Commentary Text:', lastComm?.commentaryText?.substring(0, 100));
    } catch (e) {
        console.log('Commentary API Error:', e.message);
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkEspnData();
