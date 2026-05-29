const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('users').select('id, email, phone, role').eq('email', 'dinhtai1999t@gmail.com');
  console.log("DB check for email:", data);
  const { data: d2, error: e2 } = await supabase.from('users').select('id, email, phone, role').or(`email.eq.dinhtai1999t@gmail.com,phone.eq.`);
  console.log("DB check for OR query:", d2);
}
check();
