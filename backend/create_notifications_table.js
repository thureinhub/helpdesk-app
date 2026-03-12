const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'helpdesk',
  user: process.env.DB_USER || 'helpdesk_user',
  password: process.env.DB_PASSWORD || 'helpdesk_pass',
});

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Notifications table created successfully.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    pool.end();
  }
}

run();
