require('dotenv').config();
const pool = require('./src/config/db');

async function migrate() {
  try {
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS login_id VARCHAR(50) UNIQUE`);
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`);
    console.log('Migrated.');
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    await pool.end();
  }
}
migrate();