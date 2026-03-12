const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'helpdesk',
  user: process.env.DB_USER || 'helpdesk_user',
  password: process.env.DB_PASSWORD || 'helpdesk_pass',
});

async function run() {
  try {
    const res = await pool.query('SELECT * FROM notifications ORDER BY id DESC LIMIT 10');
    console.log('Recent Notifications in DB:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
  } finally {
    pool.end();
  }
}

run();
