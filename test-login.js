const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.auth.signInWithPassword({
    phone: '84988333148',
    password: 'password_here' // I don't know the password, but let's see what error we get.
  });
  console.log(error?.message || "Success");
}
check();
