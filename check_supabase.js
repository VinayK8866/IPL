const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', 'lsg-vs-kkr-2024-01');

  if (error) {
    console.error('Database Error:', error.message);
  } else {
    console.log('--- SUPABASE MATCHES STATE ---');
    console.log(data);
    console.log('-------------------------------');
  }
}

checkDatabase();
