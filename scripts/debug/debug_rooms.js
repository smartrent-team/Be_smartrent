require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// We must use a user JWT to trigger RLS, but we only have service_role_key.
// Instead of logging in, we can use adminSupabase and impersonate or just read the RLS error?
// Wait, to test RLS, we need the user's JWT.
// But we don't have the JWT.
// Let's just run the query without RLS to see if the syntax is correct.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Testing rooms query syntax...');
  let query = supabase
    .from('rooms')
    .select('*, branch:branches(name), tenants(id, move_out_date, user:users(full_name))')
    .order('room_code', { ascending: true })
    .limit(1);

  const { data, error } = await query;
  console.log('Result:', { data, error });
})();
