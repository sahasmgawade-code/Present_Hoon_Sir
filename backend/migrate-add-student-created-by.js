require('dotenv').config();
const pool = require('./src/config/db');

async function migrate() {
  try {
    await pool.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL`);
    console.log('Migrated.');
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    await pool.end();
  }
}
migrate();