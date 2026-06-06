const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({
    user: 'postgres.xifjbxdrruqtoobzlfqz',
    password: 'dinhtai@@@999',
    host: 'aws-1-ap-northeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
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
