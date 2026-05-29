const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const emails = ['trantai1499t@gmail.com', 'dinhtai1999t@gmail.com', 'quynh1@gmail.com', 'nrowavip.20@gmail.com', 'quanhieu12ha@gmail.com'];
  const matched = authUsers.users.filter(u => emails.includes(u.email) || (u.phone && u.phone.includes('84')));
  console.log(matched.map(u => ({ id: u.id, email: u.email, phone: u.phone })));
}
check();
