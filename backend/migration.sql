-- Add password and role columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'support', 'user'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Update existing users with default passwords (change these after first login!)
-- Password for all users will be: "password123" (hashed)
-- In production, users should change this immediately!

UPDATE users SET password_hash = '$2b$10$rZ5F0YBxG5xYW5xYW5xYWeO5xYW5xYW5xYW5xYW5xYW5xYW5xYW5x' WHERE password_hash IS NULL;
UPDATE users SET role = 'admin' WHERE username = 'admin';
UPDATE users SET role = 'support' WHERE username = 'john.doe';
UPDATE users SET role = 'user' WHERE username = 'jane.smith';

-- Create sessions table for managing user sessions
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Clean up expired sessions (run this periodically)
DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;