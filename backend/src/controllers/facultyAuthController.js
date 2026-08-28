const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
async function facultyLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const result = await pool.query('SELECT * FROM faculties WHERE email = $1', [email]);
    const faculty = result.rows[0];
    if (!faculty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!faculty.is_active) {
      return res.status(403).json({ error: 'This faculty account has been deactivated' });
    }
    if (!faculty.password_hash) {
      return res.status(401).json({ error: 'Please set your password using the link sent to your email before logging in.' });
    }
    const isMatch = await bcrypt.compare(password, faculty.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: faculty.id, name: faculty.name, type: 'faculty' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      faculty: { id: faculty.id, name: faculty.name, email: faculty.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
async function changeFacultyPassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  try {
    const result = await pool.query('SELECT * FROM faculties WHERE id = $1', [req.faculty.id]);
    const faculty = result.rows[0];
    if (!faculty) return res.status(404).json({ error: 'Faculty not found' });
    const isMatch = await bcrypt.compare(currentPassword, faculty.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE faculties SET password_hash = $1 WHERE id = $2', [newHash, faculty.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
async function verifyFacultyResetToken(req, res) {
  const { token } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, name, email, password_reset_expires FROM faculties WHERE password_reset_token = $1',
      [token]
    );
    const faculty = result.rows[0];
    if (!faculty || !faculty.password_reset_expires || new Date(faculty.password_reset_expires) < new Date()) {
      return res.status(400).json({ error: 'This link is invalid or has expired.' });
    }
    res.json({ name: faculty.name, email: faculty.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
async function setFacultyPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    const result = await pool.query(
      'SELECT id, password_reset_expires FROM faculties WHERE password_reset_token = $1',
      [token]
    );
    const faculty = result.rows[0];
    if (!faculty || !faculty.password_reset_expires || new Date(faculty.password_reset_expires) < new Date()) {
      return res.status(400).json({ error: 'This link is invalid or has expired.' });
    }
    const newHash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE faculties
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL
       WHERE id = $2`,
      [newHash, faculty.id]
    );
    res.json({ message: 'Password set successfully. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
module.exports = { facultyLogin, changeFacultyPassword, verifyFacultyResetToken, setFacultyPassword };