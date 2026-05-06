const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkData() {
  const { data, error } = await supabase
    .from('scraped_scores')
    .select('*')
    .order('scraped_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('--- Recent Scraped Scores ---');
  data.forEach(s => {
    console.log(`Match: ${s.team1_name} vs ${s.team2_name}`);
    console.log(`Status: ${s.match_status}`);
    console.log(`Summary JSONs: Batters:${!!(s.batters_json?.length)}, Bowlers:${!!(s.bowlers_json?.length)}, Balls:${!!(s.last_balls_json?.length)}`);
    console.log(`Rich JSONs: Scorecard:${!!(s.scorecard_json?.length)}, Commentary:${!!(s.commentary_json?.length)}`);
    console.log(`Scraped at: ${s.scraped_at}`);
    console.log('---------------------------');
  });
}

checkData();
