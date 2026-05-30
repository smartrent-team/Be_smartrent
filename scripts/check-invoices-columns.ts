import fs from 'fs'
import path from 'path'
import { createAdminClient } from '../src/lib/supabase/admin'

const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1)
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1)
      }
      process.env[key] = value.trim()
    }
  })
}

async function testColumns(columns: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('invoices').select(columns).limit(0)
  if (error) {
    console.log(`Selection of "${columns}" failed:`, error.message)
    return false;
  } else {
    console.log(`Selection of "${columns}" succeeded!`)
    return true;
  }
}

async function main() {
  console.log('Testing column existences...')
  await testColumns('id, created_at, tenant_id, room_id, invoice_code, total_amount, payment_status, issued_at')
  await testColumns('room_price, service_cost, electric_cost, water_cost')
  await testColumns('electric_old')
  await testColumns('electric_new')
  await testColumns('water_old')
  await testColumns('water_new')
  await testColumns('checkoutUrl')
  await testColumns('qrPayload')
}

main().catch(console.error)
