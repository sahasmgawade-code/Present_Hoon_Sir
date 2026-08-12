const pool = require('./src/config/db');

(async () => {
  try {
    await pool.query(`
      ALTER TABLE batches
      ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log('Migration successful: batches.is_archived added.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
})();