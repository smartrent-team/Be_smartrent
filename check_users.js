const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    await client.connect();
    const result = await client.query('SELECT id, email, phone, role, organization_id, branch_id FROM users');
    console.log(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
})();
