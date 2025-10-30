// backend/setupUsers.js
// Run this script once to set up user passwords: node setupUsers.js
require('dotenv').config();
const { Pool } = require('pg');
const { hashPassword } = require('./passwordUtils');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'helpdesk',
  user: process.env.DB_USER || 'helpdesk_user',
  password: process.env.DB_PASSWORD || 'helpdesk_pass',
});

async function setupUsers() {
  console.log('🔧 Setting up users with passwords...');

  try {
    // Add columns if they don't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
    `);

    // Create sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Default password for all users
    const defaultPassword = 'password123';
    const hashedPassword = await hashPassword(defaultPassword);

    // Update existing users
    const users = [
      { username: 'admin', role: 'admin' },
      { username: 'john.doe', role: 'support' },
      { username: 'jane.smith', role: 'user' }
    ];

    for (const user of users) {
      await pool.query(
        `UPDATE users 
         SET password_hash = $1, role = $2, is_active = true 
         WHERE username = $3`,
        [hashedPassword, user.role, user.username]
      );
      console.log(`✅ Updated user: ${user.username} (${user.role})`);
    }

    console.log('\n🎉 Setup complete!');
    console.log('\n📝 Default credentials:');
    console.log('   Username: admin      | Password: password123 | Role: admin');
    console.log('   Username: john.doe   | Password: password123 | Role: support');
    console.log('   Username: jane.smith | Password: password123 | Role: user');
    console.log('\n⚠️  Please change these passwords after first login!');

  } catch (error) {
    console.error('❌ Error setting up users:', error);
  } finally {
    await pool.end();
  }
}

setupUsers();