import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function test() {
  console.log('--- Tenants ---')
  const { data: tenants, error: err1 } = await supabase.from('tenants').select('*').limit(1)
  console.log(err1 ? err1.message : Object.keys(tenants?.[0] || {}))

  console.log('--- Invoices ---')
  const { data: invoices, error: err2 } = await supabase.from('invoices').select('*').limit(1)
  console.log(err2 ? err2.message : Object.keys(invoices?.[0] || {}))

  console.log('--- Tickets ---')
  const { data: tickets, error: err3 } = await supabase.from('maintenance_tickets').select('*').limit(1)
  console.log(err3 ? err3.message : Object.keys(tickets?.[0] || {}))
  
  // Try fallback payload naming conventions if needed
  if (err3) {
      console.log('--- maintenance-tickets ---')
      const { data: tickets2, error: err4 } = await supabase.from('maintenance-tickets').select('*').limit(1)
      console.log(err4 ? err4.message : Object.keys(tickets2?.[0] || {}))
  }
}

test()
