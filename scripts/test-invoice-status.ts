import { createAdminClient } from '../src/lib/supabase/admin'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_code, payment_status, payment_link_id')
    .eq('invoice_code', 'INV-202605-0001')
  
  console.log(data)
}
run()
