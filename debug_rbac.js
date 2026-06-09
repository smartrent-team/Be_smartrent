require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const email = 'superadmin@smartrent.vn';
  console.log('Testing with email:', email);
  
  let query = adminSupabase
    .from('users')
    .select(`
      id,
      role,
      branch_id,
      organization_id,
      organizations (
        payment_bank_bin,
        payment_account_number,
        payment_account_name,
        payos_client_id,
        payos_api_key,
        payos_checksum_key
      )
    `)
    .eq('email', email);

  const { data, error } = await query.single();
  console.log('Result:', { data, error });
})();
