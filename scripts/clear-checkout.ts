import { createAdminClient } from '../src/lib/supabase/admin'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('invoices')
    .update({ checkoutUrl: null, payment_link_id: null })
    .eq('id', 1)
  
  if (error) console.error('Error:', error)
  else console.log('Successfully cleared checkout URL')
}
run()
