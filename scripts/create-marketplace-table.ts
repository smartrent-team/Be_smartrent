import fs from 'fs'
import path from 'path'
import { Client } from 'pg'

const envPath = path.resolve(__dirname, '../.env.local')
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
  console.error('DATABASE_URL not found in .env.local')
  process.exit(1)
}

async function tryConnectAndMigrate() {
  const parsed = new URL(connectionString)
  const passwordDecoded = decodeURIComponent(parsed.password)
  const dbName = parsed.pathname.substring(1).split('?')[0]

  const userParts = parsed.username.split('.')
  const tenantRef = userParts[1] || 'xifjbxdrruqtoobzlfqz'
  const directSNIHost = `db.${tenantRef}.supabase.co`

  const configs = [
    {
      name: 'Direct SNI Host (Port 5432, postgres user)',
      host: directSNIHost,
      port: 5432,
      user: 'postgres',
      password: passwordDecoded,
      database: dbName,
    },
    {
      name: 'Direct Connection (Port 5432, full username)',
      host: parsed.hostname,
      port: 5432,
      user: parsed.username,
      password: passwordDecoded,
      database: dbName,
    },
    {
      name: 'Pooler Connection (Port 6543, full username)',
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
        `CREATE TABLE IF NOT EXISTS marketplace_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
          tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          price NUMERIC NOT NULL DEFAULT 0,
          images JSONB NOT NULL DEFAULT '[]'::jsonb,
          status VARCHAR(50) NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'active', 'rejected', 'sold')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`,
        `CREATE INDEX IF NOT EXISTS idx_marketplace_posts_branch_id ON marketplace_posts(branch_id);`,
        `CREATE INDEX IF NOT EXISTS idx_marketplace_posts_status ON marketplace_posts(status);`,
        `-- Tạo hoặc thay thế hàm tự động cập nhật updated_at
         CREATE OR REPLACE FUNCTION update_updated_at_column()
         RETURNS TRIGGER AS $$
         BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
         END;
         $$ language 'plpgsql';`,
        `DROP TRIGGER IF EXISTS trg_marketplace_posts_updated_at ON marketplace_posts;`,
        `CREATE TRIGGER trg_marketplace_posts_updated_at
         BEFORE UPDATE ON marketplace_posts
         FOR EACH ROW
         EXECUTE PROCEDURE update_updated_at_column();`,
        `-- Bật realtime cho bảng marketplace_posts
         DO $$
         BEGIN
           IF NOT EXISTS (
             SELECT 1
             FROM pg_publication_tables
             WHERE pubname = 'supabase_realtime' AND tablename = 'marketplace_posts'
           ) THEN
             ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_posts;
           END IF;
         END
         $$;`,
        `NOTIFY pgrst, 'reload schema';`
      ]

      for (const query of queries) {
        try {
          console.log(`Executing query...`)
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
