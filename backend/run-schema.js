require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./src/config/db');
(async () => {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'src/config/schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Base schema applied successfully.');
  } catch (err) {
    console.error('Failed to apply schema:', err.message);
  } finally {
    await pool.end();
  }
})();