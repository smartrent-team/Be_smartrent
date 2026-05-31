import { createAdminClient } from '../src/lib/supabase/admin'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function run() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_code, payment_status, checkoutUrl, created_at, updated_at')
    .not('checkoutUrl', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(5)
  
  console.log(data)
}
run()
