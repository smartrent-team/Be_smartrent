import { createAdminClient } from '../src/lib/supabase/admin'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_code, checkoutUrl, payment_link_id')
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (data && data[0]) {
    console.log(data[0].checkoutUrl)
  }
}
run()
