const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_schema');
  console.log('Schema?');
  
  // Just fetch 1 user to see keys
  const { data: user } = await supabase.from('users').select('*').limit(1);
  console.log(Object.keys(user[0]));
}
check();
