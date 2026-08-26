require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./src/config/db');

async function seed() {
  const name = 'Super Admin';
  const email = 'superadmin@presenthoonsir.com'; // change if you want
  const plainPassword = 'ChangeMe123!';    // change this before running, or change after login

  try {
    const hash = await bcrypt.hash(plainPassword, 10);
    const result = await pool.query(
      `INSERT INTO admins (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'super_admin')
       RETURNING id, name, email, role`,
      [name, email, hash]
    );
    console.log('Super Admin created:', result.rows[0]);
    console.log('Login with email:', email, '| password:', plainPassword);
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();