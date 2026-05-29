const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const email = 'dinhtai1999t@gmail.com';
  const phone = '0988333148';
  let query = supabase.from('users').select('role');
  query = query.or(`email.eq.${email},phone.eq.${phone}`);
  const { data, error } = await query.single();
  console.log(data, error);
}
check();
