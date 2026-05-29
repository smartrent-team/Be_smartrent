const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
async function test() {
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      id,
      room:rooms!inner(
        room_code,
        branch_id
      )
    `)
    .eq('room.branch_id', 1)
  console.log('With room:', error?.message)

  const { data: data2, error: error2 } = await supabase
    .from('tenants')
    .select(`
      id,
      room:rooms!inner(
        room_code,
        branch_id
      )
    `)
    .eq('rooms.branch_id', 1)
  console.log('With rooms:', error2?.message)
}
test()
