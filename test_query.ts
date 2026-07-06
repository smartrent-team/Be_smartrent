import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data } = await supabase.from('users').select('id, phone, email, status').eq('status', 'deleted').limit(5)
  console.log('Deleted users:', data)
}

test().catch(console.error)
