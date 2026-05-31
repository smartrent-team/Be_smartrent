import fs from 'fs'
import path from 'path'
import { Client } from 'pg'

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

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('DATABASE_URL not found in .env')
  process.exit(1)
}

async function tryConnectAndMigrate() {
  const parsed = new URL(connectionString as string)
  const passwordDecoded = decodeURIComponent(parsed.password)
  const dbName = parsed.pathname.substring(1).split('?')[0]
  
  // Extract tenant ID from user (e.g. postgres.xifjbxdrruqtoobzlfqz -> xifjbxdrruqtoobzlfqz)
  const userParts = parsed.username.split('.')
  const tenantRef = userParts[1] || 'xifjbxdrruqtoobzlfqz'
  const directSNIHost = `db.${tenantRef}.supabase.co`
  
  // List of connection configurations to try
  const configs = [
    {
      name: "Direct SNI Host (Port 5432, postgres user)",
      host: directSNIHost,
      port: 5432,
      user: "postgres",
      password: passwordDecoded,
      database: dbName,
    },
    {
      name: "Direct Connection (Port 5432, full username)",
      host: parsed.hostname,
      port: 5432,
      user: parsed.username,
      password: passwordDecoded,
      database: dbName,
    },
    {
      name: "Pooler Connection (Port 6543, full username)",
      host: parsed.hostname,
      port: 6543,
      user: parsed.username,
      password: passwordDecoded,
      database: dbName,
    }
  ]
  
  let success = false
  for (const config of configs) {
    console.log(`\nTrying: ${config.name}...`)
    console.log(`Host: ${config.host}, Port: ${config.port}, User: ${config.user}`)
    const client = new Client({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000
    })
    
    try {
      await client.connect()
      console.log('Connected successfully!')
      
      const queries = [
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electric_old double precision;`,
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS electric_new double precision;`,
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS water_old double precision;`,
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS water_new double precision;`,
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "checkoutUrl" text;`,
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "qrPayload" text;`,
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_link_id text;`,
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_account_number text;`,
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_account_name text;`,
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_bank_bin text;`,
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_description text;`,
        `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;`
      ]
      
      for (const query of queries) {
        try {
          console.log(`Executing: ${query}`)
          await client.query(query)
          console.log('Success!')
        } catch (err: any) {
          console.error(`Error executing query: ${err.message}`)
        }
      }
      
      await client.end()
      console.log('Migration finished successfully!')
      success = true
      break
    } catch (err: any) {
      console.error(`Failed with config "${config.name}": ${err.message}`)
      try {
        await client.end()
      } catch (e) {}
    }
  }
  
  if (!success) {
    throw new Error('All connection configurations failed!')
  }
}

tryConnectAndMigrate().catch(console.error)
