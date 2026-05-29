const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const email = 'dinhtai1999t@gmail.com';
  let query = supabase.from('users').select('role').eq('email', email);
  const { data, error } = await query.single();
  console.log("DB check for dinhtai1999t@gmail.com:", data, error);
}
check();
