const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users, error } = await supabase.from('users').select('id, full_name, email, phone').eq('role', 'super_admin');
  if (error) {
    console.error(error);
  } else {
    console.log(`Số lượng Super Admin: ${users.length}`);
    console.table(users);
  }
}
check();
