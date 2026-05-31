import { createAdminClient } from '../src/lib/supabase/admin'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_code, checkoutUrl, payment_link_id')
    .order('created_at', { ascending: false })
    .limit(3)
  
  console.log(data)
}
run()
