const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const tables = ['invoices', 'payments', 'maintenance_tickets'];
  for (const t of tables) {
    const { data } = await supabase.from(t).select('*').limit(1);
    console.log(`Table ${t}:`, Object.keys(data?.[0] || {}));
  }
}
check();
