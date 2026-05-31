import { createAdminClient } from '../src/lib/supabase/admin'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('invoices')
    .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', 1)
  
  if (error) console.error('Error:', error)
  else console.log('Successfully updated invoice to paid')
}
run()
