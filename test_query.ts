import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data } = await supabase.rpc('inspect_columns') || { data: null }
  
  // Alternative: run SQL query through supabase if rpc doesn't exist
  const { data: cols, error } = await supabase.from('users').select('*').limit(1)
  console.log('User ID type check (value):', typeof cols?.[0]?.id, cols?.[0]?.id)
}

test().catch(console.error)
