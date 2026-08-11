const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Public: student logs in with their Login ID + password
async function studentLogin(req, res) {
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res.status(400).json({ error: 'loginId and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, batch_id, first_name, last_name, urn, password_hash FROM students WHERE login_id = $1',
      [loginId.trim()]
    );
    const student = result.rows[0];

    if (!student || !student.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, student.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { studentId: student.id, batchId: student.batch_id, type: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        urn: student.urn,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Protected (student token): own batch + attendance status
async function getMyAttendance(req, res) {
  const { studentId, batchId } = req.student;

  try {
    const studentRes = await pool.query(
      `SELECT s.id, s.urn, s.first_name, s.last_name, s.is_blacklisted,
              b.id AS batch_id, b.name AS batch_name
       FROM students s
       JOIN batches b ON b.id = s.batch_id
       WHERE s.id = $1`,
      [studentId]
    );
    if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    const student = studentRes.rows[0];

    const workingDaysRes = await pool.query(
      'SELECT COUNT(DISTINCT date) AS total FROM attendance WHERE batch_id = $1',
      [batchId]
    );
    const totalWorkingDays = parseInt(workingDaysRes.rows[0].total, 10) || 0;

    const historyRes = await pool.query(
      `SELECT date, status, method, marked_at
       FROM attendance
       WHERE student_id = $1 AND batch_id = $2
       ORDER BY date DESC`,
      [studentId, batchId]
    );

    const presentCount = historyRes.rows.filter((r) => r.status === 'present').length;
    const percentage = totalWorkingDays > 0
      ? Math.round((presentCount / totalWorkingDays) * 10000) / 100
      : 0;

    res.json({
      student: {
        id: student.id,
        urn: student.urn,
        firstName: student.first_name,
        lastName: student.last_name,
        isBlacklisted: student.is_blacklisted,
      },
      batch: {
        id: student.batch_id,
        name: student.batch_name,
      },
      totalWorkingDays,
      presentCount,
      percentage,
      history: historyRes.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { studentLogin, getMyAttendance };