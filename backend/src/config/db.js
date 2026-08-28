const { Pool, types } = require('pg');
require('dotenv').config();
types.setTypeParser(1082, (val) => val);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
module.exports = pool;