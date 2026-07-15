require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const sql = fs.readFileSync('supabase/migrations/12_add_performance_indexes.sql', 'utf8');
    console.log('Executing migration...');
    await client.query(sql);
    console.log('Migration executed successfully!');
  } catch (error) {
    console.error('Error executing migration:', error);
  } finally {
    await client.end();
  }
}

main();
