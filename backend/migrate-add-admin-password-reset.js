require('dotenv').config();
const pool = require('./src/config/db');

async function migrate() {
  try {
    await pool.query(`ALTER TABLE admins ALTER COLUMN password_hash DROP NOT NULL`);
    await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)`);
    await pool.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP`);
    console.log('Migrated.');
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    await pool.end();
  }
}
migrate();