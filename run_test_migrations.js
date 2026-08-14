require('dotenv').config({ path: '.env.test' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to test database:', process.env.DATABASE_URL.split('@')[1]); // Log host for safety

    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`Executing migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Execute each migration
      await client.query(sql);
    }
    
    console.log('✅ All migrations executed successfully on test DB!');
  } catch (error) {
    console.error('❌ Error executing migrations:', error.message || error);
  } finally {
    await client.end();
  }
}

main();
