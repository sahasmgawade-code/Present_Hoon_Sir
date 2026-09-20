require('dotenv').config();
const { Pool } = require('pg');

  const isLocalDb = /@(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL || '');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalDb ? false : { rejectUnauthorized: false }
  });
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};