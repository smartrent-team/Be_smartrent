import { createAdminClient } from '../src/lib/supabase/admin'

async function main() {
  const admin = createAdminClient()
  const { data, error } = await admin.from('users').select('*').eq('email', 'admin@smartrent.vn')
  console.log('Profile:', JSON.stringify(data, null, 2))
  console.log('Error:', error)

  // Check auth users too
  const { data: authUsers } = await admin.auth.admin.listUsers()
  const adminAuth = authUsers?.users.find(u => u.email === 'admin@smartrent.vn')
  console.log('\nAuth user:', JSON.stringify(adminAuth ? { id: adminAuth.id, email: adminAuth.email, confirmed: adminAuth.email_confirmed_at } : null, null, 2))
}

main().catch(console.error)
